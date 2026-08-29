"""Risk-priority evaluation and policy-evidence matching logic."""

import re
from dataclasses import dataclass, field
from uuid import UUID

from app.models import BusinessRiskScore, DocumentChunk, Policy
from app.modules.recommendations.constants import (
    PRIORITY_WEIGHTS,
    RISK_ALIASES,
    RISK_KEYWORDS,
)
from app.modules.recommendations.schemas import RiskScoreOut


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


class RiskEngine:
    """Evaluates risk priorities and matches policy evidence to risks."""

    @staticmethod
    def canonical_risk_name(name: str) -> str:
        normalized = re.sub(r"\s+", " ", name or "").strip()
        return RISK_ALIASES.get(normalized, normalized)

    @staticmethod
    def score_to_out(score: BusinessRiskScore) -> RiskScoreOut:
        return RiskScoreOut(
            risk_category_name=score.risk_category.name
            if score.risk_category
            else "Unknown",
            score=float(score.score),
            risk_level=score.risk_level,
            factor_breakdown=score.factor_breakdown,
        )

    @staticmethod
    def select_priority_risks(scores: list[BusinessRiskScore]) -> list[RiskPriority]:
        ranked = sorted(scores, key=lambda s: float(s.score), reverse=True)
        priorities: list[RiskPriority] = []
        for index, score in enumerate(ranked):
            if not score.risk_category:
                continue
            name = RiskEngine.canonical_risk_name(score.risk_category.name)
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

    @staticmethod
    def risk_text_patterns(risks: list[RiskPriority]) -> list[str]:
        patterns: list[str] = []
        for risk in risks:
            patterns.append(risk.name.replace(" Risk", ""))
            patterns.extend(RISK_KEYWORDS.get(risk.name, [])[:6])
        return list(dict.fromkeys(p.lower() for p in patterns if p))

    @staticmethod
    def aggregate_policy_evidence(
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
            matched_risks = RiskEngine._chunk_risk_matches(chunk, risks)
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
            evidence.recommendation_score = RiskEngine._score_policy_evidence(
                evidence, risk_by_name
            )

        return {
            policy_id: evidence
            for policy_id, evidence in evidence_by_policy.items()
            if evidence.matched_risks and evidence.recommendation_score > 0
        }

    @staticmethod
    def _chunk_risk_matches(
        chunk: DocumentChunk,
        risks: list[RiskPriority],
    ) -> dict[str, float]:
        text = RiskEngine._chunk_search_text(chunk)
        matches: dict[str, float] = {}
        policy_category = RiskEngine.canonical_risk_name(
            chunk.policy.insurance_category.risk_category.name
            if chunk.policy
            and chunk.policy.insurance_category
            and chunk.policy.insurance_category.risk_category
            else ""
        )
        insurance_category = RiskEngine.canonical_risk_name(
            chunk.document_metadata.get("insurance_category", "")
            if chunk.document_metadata
            else ""
        )
        section_name = RiskEngine.canonical_risk_name(
            chunk.document_metadata.get("section_name", "")
            if chunk.document_metadata
            else ""
        )
        policy_name = RiskEngine.canonical_risk_name(
            chunk.document_metadata.get("policy_name", "")
            if chunk.document_metadata
            else ""
        )

        for risk in risks:
            strength = 0.0
            if risk.name in {policy_category, insurance_category, section_name, policy_name}:
                strength += 1.0

            simplified_risk = risk.name.replace(" Risk", "").lower()
            if simplified_risk and simplified_risk in text:
                strength += 0.25

            keywords = RISK_KEYWORDS.get(risk.name, [])
            keyword_hits = 0
            for keyword in keywords:
                if re.search(r"\b" + re.escape(keyword.lower()) + r"\b", text):
                    keyword_hits += 1
            if keyword_hits:
                strength += min(0.9, 0.25 + keyword_hits * 0.12)

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
