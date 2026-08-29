"""Response-building logic for the recommendations module."""

import json
import re
from uuid import UUID

from app.models import BusinessRiskScore, DocumentChunk, Recommendation
from app.modules.recommendations.constants import (
    BENEFIT_TERMS,
    HIGHLIGHT_BENEFIT_TERMS,
    HIGHLIGHT_LIMITATION_TERMS,
    IMPORTANT_LIMITATION_TERMS,
    MAX_RECOMMENDATIONS,
    UNKNOWN_LABEL,
)
from app.modules.recommendations import repository
from app.modules.recommendations.risk_engine import PolicyEvidence, RiskEngine
from app.modules.recommendations.schemas import (
    PolicyOut,
    RecommendationListOut,
    RecommendationOut,
    SupportingChunkOut,
)
from sqlalchemy.ext.asyncio import AsyncSession


class RecommendationPresenter:
    """Builds recommendation response objects from domain models."""

    def build_policy_response(
        self,
        session_id: UUID,
        scores: list[BusinessRiskScore],
        rec_models: list[Recommendation],
    ) -> RecommendationListOut:
        score_out = [RiskEngine.score_to_out(s) for s in scores]
        business_risk_names = [
            RiskEngine.canonical_risk_name(score.risk_category_name)
            for score in score_out
        ]
        business_id = rec_models[0].business_id if rec_models else None
        recommendations: list[RecommendationOut] = []
        seen_policy_ids: set = set()
        for rec in rec_models:
            evidence = getattr(rec, "_evidence", None)
            if not evidence:
                continue
            if evidence.policy.id in seen_policy_ids:
                continue
            seen_policy_ids.add(evidence.policy.id)
            recommendations.append(
                self.evidence_to_recommendation(
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

    async def build_existing_response(
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
                scores=[RiskEngine.score_to_out(s) for s in scores],
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
                RiskEngine.canonical_risk_name(
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
        return self.build_policy_response(session_id, scores, rec_models)

    def evidence_to_recommendation(
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
        return RecommendationOut(
            priority=priority,
            risk_category_name=", ".join(matched),
            risk_score=risk_score,
            risk_level=risk_level,
            policies=[self.policy_to_out(policy, evidence)],
            company_name=policy.insurer.name if policy.insurer else UNKNOWN_LABEL,
            policy_id=policy.id,
            policy_name=policy.policy_name,
            recommendation_score=evidence.recommendation_score,
            coverage_match_count=len(covered_business_risks),
            coverage_match_total=coverage_total,
            matched_risk_categories=covered_business_risks,
            additional_inclusions=additional_inclusions,
            why_recommended=self.build_reason_text(evidence, matched),
            coverage_summary=self.coverage_summary(evidence),
            key_benefits=self.key_benefits(evidence),
            important_limitations=self.important_limitations(evidence),
            coverage_highlights=self.advisor_coverage_highlights(evidence, matched),
            supporting_chunks=self.supporting_chunks(evidence),
        )

    def policy_to_out(self, policy, evidence: PolicyEvidence) -> PolicyOut:
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
            coverage_highlights=self.clean_coverage_highlights(
                [chunk.chunk_text for chunk in evidence.all_chunks]
            ),
        )

    def build_reason_text(
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

    def coverage_summary(self, evidence: PolicyEvidence) -> str:
        highlights = self.clean_coverage_highlights(
            [chunk.chunk_text for chunk in evidence.all_chunks],
            limit=2,
        )
        if highlights:
            return " ".join(highlights)
        categories = ", ".join(evidence.matched_risks)
        return f"Relevant policy wording was found for {categories}."

    def key_benefits(self, evidence: PolicyEvidence) -> list[str]:
        return self.extract_lines(evidence.all_chunks, BENEFIT_TERMS, limit=5)

    def important_limitations(self, evidence: PolicyEvidence) -> list[str]:
        return self.extract_lines(
            evidence.all_chunks, IMPORTANT_LIMITATION_TERMS, limit=4
        )

    def advisor_coverage_highlights(
        self,
        evidence: PolicyEvidence,
        matched_risks: list[str],
    ) -> list[str]:
        highlights: list[str] = []
        for risk_name in matched_risks:
            chunks = evidence.chunks_by_risk.get(risk_name, [])
            benefit_lines = self.extract_lines(
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

            limitation_lines = self.extract_lines(
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

    def supporting_chunks(self, evidence: PolicyEvidence) -> list[SupportingChunkOut]:
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
                    chunk_text=self.shorten_text(chunk.chunk_text, 600),
                    matched_risk_categories=[
                        name
                        for name, chunks in evidence.chunks_by_risk.items()
                        if chunk in chunks
                    ],
                )
            )
        return outputs

    def recommendation_payload(
        self, evidence: PolicyEvidence, risks
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

    @staticmethod
    def extract_lines(
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
                    lines.append(RecommendationPresenter.shorten_text(line, 180))
                if len(lines) >= limit:
                    return list(dict.fromkeys(lines))
        return list(dict.fromkeys(lines))

    @staticmethod
    def shorten_text(text: str, max_length: int) -> str:
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) <= max_length:
            return text
        return text[: max_length - 3].rstrip() + "..."

    @staticmethod
    def clean_coverage_highlights(chunks: list[str], limit: int = 3) -> list[str]:
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
