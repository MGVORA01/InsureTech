"""Business logic for the recommendations module."""

import json
import re
from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.core.logging import get_logger
from app.models import (
    BusinessRiskScore,
    DocumentChunk,
    Policy,
    Recommendation,
    User,
)
from app.modules.businesses.service import Service as BusinessService
from app.modules.profiling.service import Service as ProfilingService
from app.modules.recommendations.constants import (
    BENEFIT_TERMS,
    DEFAULT_SEGMENT,
    HIGHLIGHT_BENEFIT_TERMS,
    HIGHLIGHT_LIMITATION_TERMS,
    IMPORTANT_LIMITATION_TERMS,
    MAX_RECOMMENDATIONS,
    NO_RECOMMENDATIONS_YET_MESSAGE,
    NO_RISK_SCORES_MESSAGE,
    NO_SUITABLE_POLICY_EVIDENCE_MESSAGE,
    POLICY_DOWNLOAD_RETRIEVED_MESSAGE,
    POLICY_PDF_UNAVAILABLE_MESSAGE,
    PRIORITY_WEIGHTS,
    PROFILING_SESSION_NOT_FOUND_MESSAGE,
    RECOMMENDATIONS_FETCHED_MESSAGE,
    RECOMMENDATIONS_GENERATED_MESSAGE,
    RECOMMENDED_POLICY_NOT_FOUND_MESSAGE,
    RISK_ALIASES,
    RISK_KEYWORDS,
    UNKNOWN_LABEL,
)
from app.modules.recommendations import repository
from app.modules.recommendations.schemas import (
    PolicyOut,
    RecommendationDownloadOut,
    RecommendationListOut,
    RecommendationOut,
    RiskScoreOut,
    SupportingChunkOut,
)
from app.shared.response import APIResponse

logger = get_logger(__name__)


@dataclass
class RiskPriority:
    id: UUID
    name: str
    score: float
    level: str
    weight: float
    rank: int


@dataclass
class PolicyEvidence:
    policy: Policy
    matched_risks: dict[str, float] = field(default_factory=dict)
    chunks_by_risk: dict[str, list[DocumentChunk]] = field(default_factory=dict)
    all_chunks: list[DocumentChunk] = field(default_factory=list)
    recommendation_score: float = 0.0


class RecommendationService:
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
        out = await self._build_existing_response(db, session_id, scores, existing)
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

        risk_priorities = self._select_priority_risks(scores)

        if not risk_priorities:
            return APIResponse.success_response(
                NO_RISK_SCORES_MESSAGE,
                RecommendationListOut(
                    session_id=session_id,
                    business_profile_id=business.id,
                    scores=[self._score_to_out(s) for s in scores],
                    recommendations=[],
                ).model_dump(),
            )

        segment = business.segment.name.lower() if business.segment else DEFAULT_SEGMENT
        chunks = await repository.get_candidate_chunks_for_risk_categories(
            db=db,
            risk_category_ids=[r.id for r in risk_priorities],
            segment=segment,
            text_patterns=self._risk_text_patterns(risk_priorities),
        )
        policy_evidence = self._aggregate_policy_evidence(chunks, risk_priorities)
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
                    scores=[self._score_to_out(s) for s in scores],
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
                reason_text=self._recommendation_payload(evidence, risk_priorities),
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

        out = self._build_policy_response(session_id, scores, saved)
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
            payload = self._parse_recommendation_payload(rec.reason_text)
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

    def _build_policy_response(
        self,
        session_id: UUID,
        scores: list[BusinessRiskScore],
        rec_models: list[Recommendation],
    ) -> RecommendationListOut:
        score_out = [self._score_to_out(s) for s in scores]
        business_risk_names = [
            self._canonical_risk_name(score.risk_category_name) for score in score_out
        ]
        business_id = rec_models[0].business_id if rec_models else None
        recommendations: list[RecommendationOut] = []
        for rec in rec_models:
            evidence = getattr(rec, "_evidence", None)
            if not evidence:
                continue
            recommendations.append(
                self._evidence_to_recommendation(
                    evidence=evidence,
                    priority=rec.priority,
                    risk_level=rec.risk_level or rec.priority,
                    risk_score=float(rec.risk_score or 0),
                    business_risk_names=business_risk_names,
                )
            )
        return RecommendationListOut(
            session_id=session_id,
            business_profile_id=business_id,
            scores=score_out,
            recommendations=sorted(
                recommendations,
                key=lambda item: (
                    len(item.matched_risk_categories),
                    item.recommendation_score or 0,
                ),
                reverse=True,
            )[:MAX_RECOMMENDATIONS],
        )

    async def _build_existing_response(
        self,
        db: AsyncSession,
        session_id: UUID,
        scores: list[BusinessRiskScore],
        rec_models: list[Recommendation],
    ) -> RecommendationListOut:
        payload_by_rec: dict[UUID, dict] = {}
        policy_ids: list[UUID] = []
        for rec in rec_models:
            payload = self._parse_recommendation_payload(rec.reason_text)
            payload_by_rec[rec.id] = payload
            policy_id = payload.get("policy_id")
            if policy_id:
                policy_ids.append(UUID(policy_id))

        if not policy_ids:
            return RecommendationListOut(
                session_id=session_id,
                business_profile_id=rec_models[0].business_id if rec_models else None,
                scores=[self._score_to_out(s) for s in scores],
                recommendations=[],
            )
        policies = await repository.get_policies_by_ids(db, policy_ids)
        policy_map = {policy.id: policy for policy in policies}
        chunks = await repository.get_document_chunks_for_policies(db, list(policy_map))
        for rec in rec_models:
            payload = payload_by_rec.get(rec.id, {})
            policy_id = UUID(payload["policy_id"]) if payload.get("policy_id") else None
            policy = policy_map.get(policy_id)
            if not policy:
                continue
            evidence = PolicyEvidence(
                policy=policy, recommendation_score=float(rec.risk_score or 0) * 100
            )
            matched_names = payload.get("matched_risk_categories") or [
                self._canonical_risk_name(
                    rec.risk_category.name if rec.risk_category else ""
                )
            ]
            for name in matched_names:
                evidence.matched_risks[name] = evidence.recommendation_score
            evidence.all_chunks = [
                chunk for chunk in chunks if chunk.policy_id == policy.id
            ][:5]
            for name in matched_names:
                evidence.chunks_by_risk[name] = evidence.all_chunks[:3]
            rec._evidence = evidence
        return self._build_policy_response(session_id, scores, rec_models)

    def _select_priority_risks(
        self, scores: list[BusinessRiskScore]
    ) -> list[RiskPriority]:
        ranked = sorted(scores, key=lambda s: float(s.score), reverse=True)
        priorities: list[RiskPriority] = []
        for index, score in enumerate(ranked):
            if not score.risk_category:
                continue
            name = self._canonical_risk_name(score.risk_category.name)
            rank_weight = PRIORITY_WEIGHTS[min(index, len(PRIORITY_WEIGHTS) - 1)]
            risk_weight = max(float(score.score), 0.15)
            weight = rank_weight * risk_weight
            priorities.append(
                RiskPriority(
                    id=score.risk_category_id,
                    name=name,
                    score=float(score.score),
                    level=score.risk_level,
                    weight=weight,
                    rank=index + 1,
                )
            )
        return priorities

    def _risk_text_patterns(self, risks: list[RiskPriority]) -> list[str]:
        patterns: list[str] = []
        for risk in risks:
            patterns.append(risk.name.replace(" Risk", ""))
            patterns.extend(RISK_KEYWORDS.get(risk.name, [])[:6])
        return list(dict.fromkeys(p.lower() for p in patterns if p))

    def _aggregate_policy_evidence(
        self,
        chunks: list[DocumentChunk],
        risks: list[RiskPriority],
    ) -> dict[UUID, PolicyEvidence]:
        evidence_by_policy: dict[UUID, PolicyEvidence] = {}
        risk_by_name = {risk.name: risk for risk in risks}

        for chunk in chunks:
            if not chunk.policy:
                continue
            evidence = evidence_by_policy.setdefault(
                chunk.policy_id,
                PolicyEvidence(policy=chunk.policy),
            )
            evidence.all_chunks.append(chunk)
            matched_risks = self._chunk_risk_matches(chunk, risks)
            if not matched_risks:
                continue
            for risk_name, match_strength in matched_risks.items():
                risk = risk_by_name[risk_name]
                contribution = risk.score * risk.weight * match_strength
                evidence.matched_risks[risk_name] = max(
                    evidence.matched_risks.get(risk_name, 0),
                    contribution,
                )
                evidence.chunks_by_risk.setdefault(risk_name, [])
                if len(evidence.chunks_by_risk[risk_name]) < 4:
                    evidence.chunks_by_risk[risk_name].append(chunk)

        for evidence in evidence_by_policy.values():
            evidence.recommendation_score = self._score_policy_evidence(
                evidence, risk_by_name
            )

        return {
            policy_id: evidence
            for policy_id, evidence in evidence_by_policy.items()
            if evidence.matched_risks and evidence.recommendation_score > 0
        }

    def _chunk_risk_matches(
        self,
        chunk: DocumentChunk,
        risks: list[RiskPriority],
    ) -> dict[str, float]:
        text = self._chunk_search_text(chunk)
        matches: dict[str, float] = {}
        policy_category = self._canonical_risk_name(
            chunk.policy.insurance_category.risk_category.name
            if chunk.policy
            and chunk.policy.insurance_category
            and chunk.policy.insurance_category.risk_category
            else ""
        )
        insurance_category = self._canonical_risk_name(
            chunk.document_metadata.get("insurance_category", "")
            if chunk.document_metadata
            else ""
        )

        for risk in risks:
            strength = 0.0
            if risk.name in {policy_category, insurance_category}:
                strength += 1.0
            keywords = RISK_KEYWORDS.get(risk.name, [])
            keyword_hits = sum(1 for keyword in keywords if keyword.lower() in text)
            if keyword_hits:
                strength += min(0.9, 0.25 + keyword_hits * 0.13)
            if strength > 0:
                matches[risk.name] = min(strength, 1.4)
        return matches

    @staticmethod
    def _chunk_search_text(chunk: DocumentChunk) -> str:
        metadata = chunk.document_metadata or {}
        parts = [
            chunk.chunk_text or "",
            metadata.get("section_name", ""),
            metadata.get("section_type", ""),
            metadata.get("insurance_category", ""),
            metadata.get("policy_name", ""),
        ]
        return " ".join(str(part).lower() for part in parts if part)

    @staticmethod
    def _score_policy_evidence(
        evidence: PolicyEvidence,
        risk_by_name: dict[str, RiskPriority],
    ) -> float:
        weighted_score = sum(evidence.matched_risks.values()) * 55
        matched_count = len(evidence.matched_risks)
        total_priority_weight = sum(risk.weight for risk in risk_by_name.values()) or 1
        covered_weight = sum(
            risk_by_name[name].weight for name in evidence.matched_risks
        )
        breadth_ratio = covered_weight / total_priority_weight
        breadth_bonus = 22 * breadth_ratio
        multi_risk_bonus = 14 if matched_count >= 2 else 0
        comprehensive_bonus = 10 if matched_count >= 3 else 0
        final = weighted_score + breadth_bonus + multi_risk_bonus + comprehensive_bonus
        return round(min(final, 100), 2)

    def _evidence_to_recommendation(
        self,
        evidence: PolicyEvidence,
        priority: str,
        risk_level: str,
        risk_score: float,
        business_risk_names: list[str],
    ) -> RecommendationOut:
        policy = evidence.policy
        matched = sorted(
            evidence.matched_risks,
            key=lambda name: evidence.matched_risks[name],
            reverse=True,
        )
        business_risk_set = set(business_risk_names)
        covered_business_risks = [
            risk_name for risk_name in matched if risk_name in business_risk_set
        ]
        additional_inclusions = [
            risk_name for risk_name in matched if risk_name not in business_risk_set
        ]
        coverage_total = len(business_risk_names) or len(matched)
        policy_out = self._policy_to_out(policy, evidence)
        return RecommendationOut(
            priority=priority,
            risk_category_name=", ".join(matched),
            risk_score=risk_score,
            risk_level=risk_level,
            policies=[policy_out],
            company_name=policy.insurer.name if policy.insurer else UNKNOWN_LABEL,
            policy_id=policy.id,
            policy_name=policy.policy_name,
            recommendation_score=evidence.recommendation_score,
            coverage_match_count=len(covered_business_risks),
            coverage_match_total=coverage_total,
            matched_risk_categories=covered_business_risks,
            additional_inclusions=additional_inclusions,
            why_recommended=self._build_reason_text(evidence, matched),
            coverage_summary=self._coverage_summary(evidence),
            key_benefits=self._key_benefits(evidence),
            important_limitations=self._important_limitations(evidence),
            coverage_highlights=self._advisor_coverage_highlights(evidence, matched),
            supporting_chunks=self._supporting_chunks(evidence),
        )

    def _policy_to_out(self, policy: Policy, evidence: PolicyEvidence) -> PolicyOut:
        return PolicyOut(
            id=policy.id,
            policy_name=policy.policy_name,
            insurer_name=policy.insurer.name if policy.insurer else UNKNOWN_LABEL,
            insurer_logo_url=policy.insurer.logo_url if policy.insurer else None,
            insurance_category_name=policy.insurance_category.name
            if policy.insurance_category
            else UNKNOWN_LABEL,
            key_features=policy.key_features,
            min_sum_insured=float(policy.min_sum_insured)
            if policy.min_sum_insured
            else None,
            max_sum_insured=float(policy.max_sum_insured)
            if policy.max_sum_insured
            else None,
            target_segment=policy.target_segment,
            pdf_url=evidence.all_chunks[0].document.file_url
            if evidence.all_chunks and evidence.all_chunks[0].document
            else None,
            coverage_highlights=self._clean_coverage_highlights(
                [chunk.chunk_text for chunk in evidence.all_chunks]
            ),
        )

    def _build_reason_text(
        self, evidence: PolicyEvidence, matched_risks: list[str]
    ) -> str:
        company = (
            evidence.policy.insurer.name if evidence.policy.insurer else "the insurer"
        )
        top_risks = ", ".join(matched_risks[:3])
        if len(matched_risks) > 1:
            return (
                f"{evidence.policy.policy_name} from {company} ranks highly because it supports "
                f"multiple priority risks in the assessment: {top_risks}. This makes it a better "
                "overall protection fit than policies matching only one risk area."
            )
        return (
            f"{evidence.policy.policy_name} from {company} directly addresses the highest current "
            f"risk area: {top_risks}."
        )

    def _coverage_summary(self, evidence: PolicyEvidence) -> str:
        highlights = self._clean_coverage_highlights(
            [chunk.chunk_text for chunk in evidence.all_chunks],
            limit=2,
        )
        if highlights:
            return " ".join(highlights)
        categories = ", ".join(evidence.matched_risks)
        return f"Relevant policy wording was found for {categories}."

    def _key_benefits(self, evidence: PolicyEvidence) -> list[str]:
        return self._extract_lines(evidence.all_chunks, BENEFIT_TERMS, limit=5)

    def _important_limitations(self, evidence: PolicyEvidence) -> list[str]:
        return self._extract_lines(
            evidence.all_chunks, IMPORTANT_LIMITATION_TERMS, limit=4
        )

    def _advisor_coverage_highlights(
        self,
        evidence: PolicyEvidence,
        matched_risks: list[str],
    ) -> list[str]:
        highlights: list[str] = []
        for risk_name in matched_risks:
            chunks = evidence.chunks_by_risk.get(risk_name, [])
            benefit_lines = self._extract_lines(
                chunks,
                HIGHLIGHT_BENEFIT_TERMS,
                limit=2,
            )
            if benefit_lines:
                highlights.append(
                    f"Covers {risk_name.lower()} through: {benefit_lines[0]}"
                )
            else:
                highlights.append(
                    f"Addresses {risk_name.lower()} based on matching policy wording and category coverage."
                )

            limitation_lines = self._extract_lines(
                chunks,
                HIGHLIGHT_LIMITATION_TERMS,
                limit=1,
            )
            if limitation_lines:
                highlights.append(
                    f"Check limitation for {risk_name.lower()}: {limitation_lines[0]}"
                )

            if len(highlights) >= 6:
                break

        return list(dict.fromkeys(highlights))[:6]

    def _supporting_chunks(self, evidence: PolicyEvidence) -> list[SupportingChunkOut]:
        selected: list[DocumentChunk] = []
        for chunks in evidence.chunks_by_risk.values():
            for chunk in chunks:
                if chunk not in selected:
                    selected.append(chunk)
                if len(selected) >= 5:
                    break
            if len(selected) >= 5:
                break
        outputs: list[SupportingChunkOut] = []
        for chunk in selected:
            metadata = chunk.document_metadata or {}
            outputs.append(
                SupportingChunkOut(
                    chunk_id=chunk.id,
                    section_name=metadata.get("section_name"),
                    section_type=metadata.get("section_type"),
                    chunk_text=self._shorten_text(chunk.chunk_text, 600),
                    matched_risk_categories=[
                        name
                        for name, chunks in evidence.chunks_by_risk.items()
                        if chunk in chunks
                    ],
                )
            )
        return outputs

    def _recommendation_payload(
        self,
        evidence: PolicyEvidence,
        risks: list[RiskPriority],
    ) -> str:
        matched = sorted(
            evidence.matched_risks,
            key=lambda name: evidence.matched_risks[name],
            reverse=True,
        )
        return json.dumps(
            {
                "policy_id": str(evidence.policy.id),
                "recommendation_score": evidence.recommendation_score,
                "matched_risk_categories": matched,
                "risk_profile": [
                    {"name": risk.name, "score": risk.score, "rank": risk.rank}
                    for risk in risks
                ],
            }
        )

    @staticmethod
    def _parse_recommendation_payload(text: str) -> dict:
        try:
            payload = json.loads(text)
            return payload if isinstance(payload, dict) else {}
        except (TypeError, ValueError):
            return {}

    def _extract_lines(
        self,
        chunks: list[DocumentChunk],
        terms: tuple[str, ...],
        limit: int,
    ) -> list[str]:
        lines: list[str] = []
        for chunk in chunks:
            for raw_line in chunk.chunk_text.splitlines():
                line = re.sub(r"\s+", " ", raw_line).strip(" -*•\t")
                if len(line) < 35 or line.count("|") >= 3:
                    continue
                lower = line.lower()
                if any(term in lower for term in terms):
                    lines.append(self._shorten_text(line, 180))
                if len(lines) >= limit:
                    return list(dict.fromkeys(lines))
        return list(dict.fromkeys(lines))

    @staticmethod
    def _canonical_risk_name(name: str) -> str:
        normalized = re.sub(r"\s+", " ", name or "").strip()
        return RISK_ALIASES.get(normalized, normalized)

    @staticmethod
    def _shorten_text(text: str, max_length: int) -> str:
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) <= max_length:
            return text
        return text[: max_length - 3].rstrip() + "..."

    @staticmethod
    def _clean_coverage_highlights(chunks: list[str], limit: int = 3) -> list[str]:
        highlights: list[str] = []
        for chunk in chunks:
            for raw_line in chunk.splitlines():
                text = re.sub(r"\s+", " ", raw_line).strip(" -*•\t")
                if not text:
                    continue
                if text.count("|") >= 3 or re.search(r"-{4,}", text):
                    continue
                if len(text) < 35:
                    continue
                if len(text) > 180:
                    text = text[:177].rstrip() + "..."
                if text not in highlights:
                    highlights.append(text)
                if len(highlights) == limit:
                    return highlights
        return highlights

    @staticmethod
    def _score_to_out(score: BusinessRiskScore) -> RiskScoreOut:
        return RiskScoreOut(
            risk_category_name=score.risk_category.name
            if score.risk_category
            else UNKNOWN_LABEL,
            score=float(score.score),
            risk_level=score.risk_level,
            factor_breakdown=score.factor_breakdown,
        )

    async def _resolve_session(self, session_id: UUID, user: User, db: AsyncSession):
        session = await ProfilingService.get_session_by_id(session_id, db)
        if not session:
            raise NotFoundException(PROFILING_SESSION_NOT_FOUND_MESSAGE)
        business = await BusinessService.get_business_by_id_for_user(
            session.business_id, user, db
        )
        return session, business


Service = RecommendationService()
