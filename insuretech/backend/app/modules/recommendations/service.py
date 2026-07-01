"""Business logic for the recommendations module."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.core.logging import get_logger
from app.models import (
    BusinessRiskScore,
    Policy,
    PolicyDocument,
    Recommendation,
    User,
)
from app.modules.businesses.service import Service as BusinessService
from app.modules.recommendations import repository
from app.modules.recommendations.schemas import (
    PolicyOut,
    RecommendationListOut,
    RecommendationOut,
    RiskScoreOut,
)
from app.shared.response import APIResponse

logger = get_logger(__name__)

PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


class _RecommendationService:

    async def get_recommendations(
        self,
        session_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        existing = await repository.get_existing_recommendations(db, session_id)
        if not existing:
            return APIResponse.success_response(
                "No recommendations generated yet. Use /generate to create them.",
                RecommendationListOut(
                    session_id=session_id, scores=[], recommendations=[]
                ).model_dump(),
            )
        scores = await repository.get_business_risk_scores(db, session_id)
        existing = await self._attach_policies_to_recs(db, existing)
        out = self._build_response(session_id, scores, existing)
        return APIResponse.success_response(
            "Recommendations fetched successfully", out.model_dump()
        )

    async def generate_recommendations(
        self,
        session_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        session, business = await self._resolve_session(session_id, user, db)
        scores = await repository.get_business_risk_scores(db, session_id)

        high_scores = [
            s for s in scores
            if s.risk_level in ("critical", "high", "medium")
        ]

        if not high_scores:
            return APIResponse.success_response(
                "No significant risks found. All categories are low.",
                RecommendationListOut(
                    session_id=session_id,
                    scores=[self._score_to_out(s) for s in scores],
                    recommendations=[],
                ).model_dump(),
            )

        risk_cat_ids = list({s.risk_category_id for s in high_scores})
        insurance_categories = await repository.get_insurance_categories_for_risk_categories(
            db, risk_cat_ids
        )

        if not insurance_categories:
            return APIResponse.success_response(
                "No insurance categories mapped to your risk profile.",
                RecommendationListOut(
                    session_id=session_id,
                    scores=[self._score_to_out(s) for s in scores],
                    recommendations=[],
                ).model_dump(),
            )

        ic_ids = [ic.id for ic in insurance_categories]
        ic_risk_map = {ic.id: ic.risk_category_id for ic in insurance_categories}

        segment = business.segment.name.lower() if business.segment else "both"
        policies = await repository.get_policies_for_insurance_categories(
            db, ic_ids, segment
        )

        if not policies:
            return APIResponse.success_response(
                "No policies found matching your risk profile.",
                RecommendationListOut(
                    session_id=session_id,
                    scores=[self._score_to_out(s) for s in scores],
                    recommendations=[],
                ).model_dump(),
            )

        policy_ids = [p.id for p in policies]
        documents = await repository.get_policy_documents(db, policy_ids)
        doc_map: dict[UUID, str | None] = {}
        for doc in documents:
            if doc.policy_id not in doc_map and doc.file_url:
                doc_map[doc.policy_id] = doc.file_url

        chunks = await repository.get_document_chunks_for_policies(db, policy_ids)
        chunk_map: dict[UUID, list[str]] = {}
        for chunk in chunks:
            chunk_map.setdefault(chunk.policy_id, []).append(chunk.chunk_text)

        score_map: dict[UUID, BusinessRiskScore] = {}
        for s in high_scores:
            score_map[s.risk_category_id] = s

        rec_models = []
        for ic in sorted(
            insurance_categories,
            key=lambda x: PRIORITY_ORDER.get(
                score_map.get(x.risk_category_id).risk_level if score_map.get(x.risk_category_id) else "low", 3
            ),
        ):
            if ic.risk_category_id not in score_map:
                continue
            score = score_map[ic.risk_category_id]
            matched = [p for p in policies if p.insurance_category_id == ic.id]
            if not matched:
                continue

            factor_text = ""
            if score.factor_breakdown:
                top = sorted(score.factor_breakdown.items(), key=lambda x: -x[1])[:3]
                if top:
                    factor_text = " due to " + ", ".join(name for name, _ in top)

            rec = Recommendation(
                business_id=business.id,
                session_id=session.id,
                insurance_category_id=ic.id,
                risk_category_id=ic.risk_category_id,
                risk_score=float(score.score),
                risk_level=score.risk_level,
                priority=score.risk_level,
                reason_text=(
                    f"Your {score.risk_category.name if score.risk_category else 'Unknown'} risk "
                    f"score is {float(score.score):.0%} ({score.risk_level}){factor_text}."
                ),
                is_active=True,
            )
            rec._policies = matched
            rec_models.append(rec)

        rec_models.sort(key=lambda r: (
            PRIORITY_ORDER.get(r.priority, 3),
            -(r.risk_score or 0),
        ))

        saved = await repository.save_recommendations(db, rec_models)
        await db.commit()

        out = self._build_response(
            session_id, scores, saved, doc_map, chunk_map
        )
        return APIResponse.success_response(
            "Recommendations generated successfully", out.model_dump()
        )

    def _build_response(
        self,
        session_id: UUID,
        scores: list[BusinessRiskScore],
        rec_models: list[Recommendation],
        doc_map: dict[UUID, str | None] | None = None,
        chunk_map: dict[UUID, list[str]] | None = None,
    ) -> RecommendationListOut:
        score_out = [self._score_to_out(s) for s in scores]

        if doc_map is None and rec_models:
            doc_map = getattr(rec_models[0], "_doc_map", {})
        if chunk_map is None and rec_models:
            chunk_map = getattr(rec_models[0], "_chunk_map", {})
        if doc_map is None:
            doc_map = {}
        if chunk_map is None:
            chunk_map = {}

        grouped: dict[str, RecommendationOut] = {}
        for rec in rec_models:
            cat_name = rec.risk_category.name if rec.risk_category else "Unknown"
            key = f"{rec.risk_category_id}_{rec.insurance_category_id}"

            if key not in grouped:
                grouped[key] = RecommendationOut(
                    priority=rec.priority,
                    risk_category_name=cat_name,
                    risk_score=float(rec.risk_score) if rec.risk_score else 0.0,
                    risk_level=rec.risk_level or "low",
                    policies=[],
                )

            policies = getattr(rec, "_policies", [])
            for p in policies:
                po = PolicyOut(
                    id=p.id,
                    policy_name=p.policy_name,
                    insurer_name=p.insurer.name if p.insurer else "Unknown",
                    insurer_logo_url=p.insurer.logo_url if p.insurer else None,
                    insurance_category_name=p.insurance_category.name if p.insurance_category else "Unknown",
                    key_features=p.key_features,
                    min_sum_insured=float(p.min_sum_insured) if p.min_sum_insured else None,
                    max_sum_insured=float(p.max_sum_insured) if p.max_sum_insured else None,
                    target_segment=p.target_segment,
                    pdf_url=doc_map.get(p.id),
                    coverage_highlights=(chunk_map.get(p.id) or [])[:3],
                )
                if po not in grouped[key].policies:
                    grouped[key].policies.append(po)

        recommendations = sorted(
            grouped.values(),
            key=lambda r: (PRIORITY_ORDER.get(r.priority, 3), -r.risk_score),
        )

        return RecommendationListOut(
            session_id=session_id,
            scores=score_out,
            recommendations=recommendations,
        )

    async def _attach_policies_to_recs(
        self,
        db: AsyncSession,
        rec_models: list[Recommendation],
    ) -> list[Recommendation]:
        """Re-load policies for existing recommendations (not stored in DB)."""
        ic_ids = list({r.insurance_category_id for r in rec_models if r.insurance_category_id})
        if not ic_ids:
            return rec_models

        policies = await repository.get_policies_by_insurance_categories(db, ic_ids)
        policy_ids = [p.id for p in policies]

        documents = await repository.get_policy_documents(db, policy_ids)
        doc_map: dict[UUID, str | None] = {}
        for doc in documents:
            if doc.policy_id not in doc_map and doc.file_url:
                doc_map[doc.policy_id] = doc.file_url

        chunks = await repository.get_document_chunks_for_policies(db, policy_ids)
        chunk_map: dict[UUID, list[str]] = {}
        for chunk in chunks:
            chunk_map.setdefault(chunk.policy_id, []).append(chunk.chunk_text)

        for rec in rec_models:
            matched = [p for p in policies if p.insurance_category_id == rec.insurance_category_id]
            rec._policies = matched
            rec._doc_map = doc_map
            rec._chunk_map = chunk_map

        return rec_models

    @staticmethod
    def _score_to_out(score: BusinessRiskScore) -> RiskScoreOut:
        return RiskScoreOut(
            risk_category_name=score.risk_category.name if score.risk_category else "Unknown",
            score=float(score.score),
            risk_level=score.risk_level,
            factor_breakdown=score.factor_breakdown,
        )

    async def _resolve_session(self, session_id: UUID, user: User, db: AsyncSession):
        from app.modules.profiling.repository import get_session_by_id
        session = await get_session_by_id(db, session_id)
        if not session:
            raise NotFoundException("Profiling session not found")
        business = await BusinessService.get_business_by_id_for_user(
            session.business_id, user, db
        )
        return session, business


Service = _RecommendationService()
