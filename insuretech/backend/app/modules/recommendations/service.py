"""Business logic for the recommendations module."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.core.logging import get_logger
from app.models import BusinessRiskScore, Recommendation, User
from app.modules.businesses.service import Service as BusinessService
from app.modules.profiling.service import Service as ProfilingService
from app.modules.recommendations import repository
from app.modules.recommendations.constants import (
    DEFAULT_SEGMENT,
    MAX_RECOMMENDATIONS,
    NO_RECOMMENDATIONS_YET_MESSAGE,
    NO_RISK_SCORES_MESSAGE,
    NO_SUITABLE_POLICY_EVIDENCE_MESSAGE,
    POLICY_DOWNLOAD_RETRIEVED_MESSAGE,
    POLICY_PDF_UNAVAILABLE_MESSAGE,
    PROFILING_SESSION_NOT_FOUND_MESSAGE,
    RECOMMENDATIONS_FETCHED_MESSAGE,
    RECOMMENDATIONS_GENERATED_MESSAGE,
    RECOMMENDED_POLICY_NOT_FOUND_MESSAGE,
)
from app.modules.recommendations.presenter import RecommendationPresenter
from app.modules.recommendations.risk_engine import RiskEngine
from app.modules.recommendations.schemas import (
    RecommendationDownloadOut,
    RecommendationListOut,
)
from app.shared.response import APIResponse

logger = get_logger(__name__)


class RecommendationService:
    def __init__(self, business_service=None, profiling_service=None) -> None:
        self._business_service = business_service or BusinessService
        self._profiling_service = profiling_service or ProfilingService
        self._presenter = RecommendationPresenter()

    async def get_recommendations(
        self,
        session_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        existing = await repository.get_existing_recommendations(db, session_id)
        if not existing:
            return APIResponse.success_response(
                NO_RECOMMENDATIONS_YET_MESSAGE,
                RecommendationListOut(
                    session_id=session_id, scores=[], recommendations=[]
                ).model_dump(),
            )
        scores = await repository.get_business_risk_scores(db, session_id)
        out = await self._presenter.build_existing_response(
            db, session_id, scores, existing
        )
        return APIResponse.success_response(
            RECOMMENDATIONS_FETCHED_MESSAGE, out.model_dump()
        )

    async def generate_recommendations(
        self,
        session_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        session, business = await self._resolve_session(session_id, user, db)
        scores = await repository.get_business_risk_scores(db, session_id)
        await repository.deactivate_recommendations_for_session(db, session_id)

        risk_priorities = RiskEngine.select_priority_risks(scores)

        if not risk_priorities:
            return APIResponse.success_response(
                NO_RISK_SCORES_MESSAGE,
                RecommendationListOut(
                    session_id=session_id,
                    business_profile_id=business.id,
                    scores=[RiskEngine.score_to_out(s) for s in scores],
                    recommendations=[],
                ).model_dump(),
            )

        segment = business.segment.name.lower() if business.segment else DEFAULT_SEGMENT
        chunks = await repository.get_candidate_chunks_for_risk_categories(
            db=db,
            risk_category_ids=[r.id for r in risk_priorities],
            segment=segment,
            text_patterns=RiskEngine.risk_text_patterns(risk_priorities),
        )
        policy_evidence = RiskEngine.aggregate_policy_evidence(chunks, risk_priorities)
        top_policies = sorted(
            policy_evidence.values(),
            key=lambda item: (
                len(item.matched_risks),
                sum(
                    primary.weight
                    for primary in risk_priorities
                    if primary.name in item.matched_risks
                ),
                item.recommendation_score,
            ),
            reverse=True,
        )[:MAX_RECOMMENDATIONS]

        if not top_policies:
            return APIResponse.success_response(
                NO_SUITABLE_POLICY_EVIDENCE_MESSAGE,
                RecommendationListOut(
                    session_id=session_id,
                    business_profile_id=business.id,
                    scores=[RiskEngine.score_to_out(s) for s in scores],
                    recommendations=[],
                ).model_dump(),
            )

        rec_models: list[Recommendation] = []
        primary_risk_by_name = {risk.name: risk for risk in risk_priorities}
        for evidence in top_policies:
            primary_risk_name = max(
                evidence.matched_risks,
                key=lambda name: primary_risk_by_name[name].weight,
            )
            primary_risk = primary_risk_by_name[primary_risk_name]
            rec = Recommendation(
                business_id=business.id,
                session_id=session.id,
                insurance_category_id=evidence.policy.insurance_category_id,
                risk_category_id=primary_risk.id,
                risk_score=evidence.recommendation_score / 100,
                risk_level=primary_risk.level,
                priority=primary_risk.level,
                reason_text=self._presenter.recommendation_payload(
                    evidence, risk_priorities
                ),
                is_active=True,
            )
            rec._policy_id = evidence.policy.id
            rec._evidence = evidence
            rec_models.append(rec)

        saved = await repository.save_recommendations(db, rec_models)
        await db.commit()

        for rec, evidence in zip(saved, top_policies, strict=False):
            rec._policy_id = evidence.policy.id
            rec._evidence = evidence

        out = self._presenter.build_policy_response(session_id, scores, saved)
        return APIResponse.success_response(
            RECOMMENDATIONS_GENERATED_MESSAGE, out.model_dump()
        )

    async def get_policy_download(
        self,
        session_id: UUID,
        policy_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        await self._resolve_session(session_id, user, db)
        recommendations = await repository.get_existing_recommendations(db, session_id)
        session_policy_ids: set[UUID] = set()
        for rec in recommendations:
            payload = RecommendationPresenter._parse_recommendation_payload(
                rec.reason_text
            )
            try:
                if payload.get("policy_id"):
                    session_policy_ids.add(UUID(payload["policy_id"]))
            except (TypeError, ValueError):
                continue
        if policy_id not in session_policy_ids:
            raise NotFoundException(RECOMMENDED_POLICY_NOT_FOUND_MESSAGE)

        document = await repository.get_latest_active_policy_document(db, policy_id)
        if not document or not document.file_url:
            raise NotFoundException(POLICY_PDF_UNAVAILABLE_MESSAGE)
        if not document.file_url.startswith(("http://", "https://")):
            raise NotFoundException(POLICY_PDF_UNAVAILABLE_MESSAGE)

        data = RecommendationDownloadOut(
            policy_id=policy_id,
            file_name=document.file_name,
            download_url=document.file_url,
        )
        return APIResponse.success_response(
            POLICY_DOWNLOAD_RETRIEVED_MESSAGE,
            data.model_dump(),
        )

    async def _resolve_session(self, session_id: UUID, user: User, db: AsyncSession):
        session = await self._profiling_service.get_session_by_id(session_id, db)
        if not session:
            raise NotFoundException(PROFILING_SESSION_NOT_FOUND_MESSAGE)
        business = await self._business_service.get_business_by_id_for_user(
            session.business_id, user, db
        )
        return session, business


Service = RecommendationService()
