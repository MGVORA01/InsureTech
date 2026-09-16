import re
from typing import Any, Literal
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator

from app.modules.policy_comparison.constants import (
    INFO_NOT_AVAILABLE_MESSAGE,
    REQUIRED_COMPARISON_CATEGORIES,
)


def _clean_schema_text(text: str) -> str:
    cleaned = (text or "").strip()
    # Strip bullets
    cleaned = re.sub(r"^[\s•\-*▪▸►–—]+", "", cleaned)
    # Strip numbering prefixes like 1), 4) i), a), (i), (a) — require explicit delimiters
    while True:
        prev = cleaned
        cleaned = re.sub(r"^[\s•\-*▪▸►–—]+", "", cleaned)
        cleaned = re.sub(r"^\s*\(?\d+[.):]\s*", "", cleaned)
        cleaned = re.sub(r"^\s*\(?[a-zA-Z]{1,2}[.)]\s*", "", cleaned)
        cleaned = re.sub(r"^\s*\(?[ivxIVX]+[.)]\s*", "", cleaned)
        cleaned = cleaned.strip()
        if cleaned == prev:
            break
    # Strip ellipses
    cleaned = re.sub(r"[\s.]*(?:\.\.\.|…)+$", "", cleaned).strip()
    return cleaned


def _coerce_list_value(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        items = []
        for item in value:
            c = _clean_schema_text(str(item))
            if c:
                items.append(c)
        return items
    if isinstance(value, str):
        lines = [
            _clean_schema_text(line)
            for line in re.split(r"[\n\r]+", value)
        ]
        parts = [line for line in lines if line]
        return parts or ([_clean_schema_text(value)] if _clean_schema_text(value) else [])
    cleaned = _clean_schema_text(str(value))
    return [cleaned] if cleaned else []


class CompareRequest(BaseModel):
    business_profile_id: UUID = Field(..., description="UUID of the business profile")
    policy_id_a: UUID = Field(..., description="UUID of the first policy")
    policy_id_b: UUID = Field(..., description="UUID of the second policy")
    session_id: UUID | None = Field(
        None,
        description="Optional recommendation/profiling session used to scope comparison",
    )


class ComparisonItem(BaseModel):
    category: Literal[
        "What is Covered",
        "Coverage",
        "Exclusions",
        "Claims Process",
        "Conditions",
    ] = Field(..., description="Section comparison category")
    policy_a_value: list[str] = Field(
        ..., description="Relevant evidence-supported points from policy A"
    )
    policy_b_value: list[str] = Field(
        ..., description="Relevant evidence-supported points from policy B"
    )
    stronger: Literal["a", "b", "equal", "insufficient_evidence"] = Field(
        ..., description="Which policy is stronger in this category"
    )
    evidence: str = Field(..., description="Quoted evidence from retrieved chunks supporting the comparison")
    confidence: Literal["high", "medium", "low"] = Field(
        ..., description="Confidence based on retrieved evidence"
    )

    @field_validator("policy_a_value", "policy_b_value", mode="before")
    @classmethod
    def _coerce_policy_values(cls, value: Any) -> list[str]:
        res = _coerce_list_value(value)
        return res or [INFO_NOT_AVAILABLE_MESSAGE]


class BusinessRiskItem(BaseModel):
    risk_category: str = Field(..., description="Category of the business risk")
    risk_level: str = Field(..., description="Assessed risk level")
    policy_a: str = Field(..., description="How Policy A addresses this risk")
    policy_b: str = Field(..., description="How Policy B addresses this risk")


class CoverageGapAnalysis(BaseModel):
    covered_by_both: list[str] = Field(default_factory=list)
    covered_only_by_a: list[str] = Field(default_factory=list)
    covered_only_by_b: list[str] = Field(default_factory=list)
    covered_by_neither: list[str] = Field(default_factory=list)

    def __getitem__(self, item: str):
        """Support dict-style subscript access for backward compatibility."""
        return getattr(self, item)

    @field_validator(
        "covered_by_both",
        "covered_only_by_a",
        "covered_only_by_b",
        "covered_by_neither",
        mode="before",
    )
    @classmethod
    def _coerce_bucket(cls, value: Any) -> list[str]:
        items = _coerce_list_value(value)
        return items or [INFO_NOT_AVAILABLE_MESSAGE]


class CompareResponse(BaseModel):
    executive_summary: list[str] = Field(
        ..., description="Exactly two executive summary sentences"
    )
    comparisons: list[ComparisonItem] = Field(..., description="Section-by-section comparisons")
    coverage_gap_analysis: CoverageGapAnalysis = Field(
        ..., description="Coverage gap analysis grouped by overlap buckets"
    )
    business_risk_alignment: list[BusinessRiskItem] = Field(
        ..., description="Risk mapping for both policies"
    )
    advantages_a: list[str] = Field(..., description="Key advantages of policy A")
    advantages_b: list[str] = Field(..., description="Key advantages of policy B")
    limitations_a: list[str] = Field(..., description="Key limitations of policy A")
    limitations_b: list[str] = Field(..., description="Key limitations of policy B")
    overall_recommendation: list[str] = Field(
        ..., description="2-3 evidence-based recommendation sentences"
    )
    missing_information: list[str] = Field(..., description="Information not found in retrieved policy sections")
    overall_confidence: Literal["high", "medium", "low"] = Field(
        ..., description="Overall confidence across all comparisons"
    )

    @field_validator(
        "executive_summary",
        "overall_recommendation",
        "advantages_a",
        "advantages_b",
        "limitations_a",
        "limitations_b",
        "missing_information",
        mode="before",
    )
    @classmethod
    def _coerce_string_lists(cls, value: Any) -> list[str]:
        res = _coerce_list_value(value)
        return res or [INFO_NOT_AVAILABLE_MESSAGE]

    @field_validator("coverage_gap_analysis", mode="before")
    @classmethod
    def _coerce_coverage_gap(cls, value: Any) -> Any:
        if isinstance(value, CoverageGapAnalysis):
            return value
        keys = (
            "covered_by_both",
            "covered_only_by_a",
            "covered_only_by_b",
            "covered_by_neither",
        )
        if not isinstance(value, dict):
            base = _coerce_list_value(value)
            unavailable = base if base else [INFO_NOT_AVAILABLE_MESSAGE]
            return CoverageGapAnalysis(
                covered_by_both=unavailable[:],
                covered_only_by_a=unavailable[:],
                covered_only_by_b=unavailable[:],
                covered_by_neither=unavailable[:],
            )

        return CoverageGapAnalysis(
            covered_by_both=_coerce_list_value(value.get("covered_by_both")) or [INFO_NOT_AVAILABLE_MESSAGE],
            covered_only_by_a=_coerce_list_value(value.get("covered_only_by_a")) or [INFO_NOT_AVAILABLE_MESSAGE],
            covered_only_by_b=_coerce_list_value(value.get("covered_only_by_b")) or [INFO_NOT_AVAILABLE_MESSAGE],
            covered_by_neither=_coerce_list_value(value.get("covered_by_neither")) or [INFO_NOT_AVAILABLE_MESSAGE],
        )

    @field_validator("business_risk_alignment", mode="before")
    @classmethod
    def _coerce_business_risk_alignment(
        cls,
        value: Any,
    ) -> list[Any]:
        if isinstance(value, list):
            normalized = []
            for item in value:
                if isinstance(item, BusinessRiskItem):
                    normalized.append(item)
                elif isinstance(item, dict):
                    normalized.append(
                        BusinessRiskItem(
                            risk_category=str(item.get("risk_category", "")).strip() or "Business Risk",
                            risk_level=str(item.get("risk_level", "")).strip() or "Medium",
                            policy_a=str(item.get("policy_a", "")).strip() or "not specifically addressed",
                            policy_b=str(item.get("policy_b", "")).strip() or "not specifically addressed",
                        )
                    )
            return normalized

        # Fallback for text representation
        text_items = _coerce_list_value(value)
        if not text_items:
            return []
        return [
            BusinessRiskItem(
                risk_category="Business Risk",
                risk_level="Medium",
                policy_a=text_items[0],
                policy_b=text_items[0],
            )
        ]

    @model_validator(mode="after")
    def _validate_contract(self):
        if len(self.executive_summary) != 2:
            raise ValueError("executive_summary must contain exactly 2 items")
        if len(self.comparisons) != len(REQUIRED_COMPARISON_CATEGORIES):
            raise ValueError("comparisons must contain exactly 5 categories")

        categories = [c.category for c in self.comparisons]
        if categories != list(REQUIRED_COMPARISON_CATEGORIES):
            raise ValueError(
                "comparisons categories must be exactly: "
                + ", ".join(REQUIRED_COMPARISON_CATEGORIES)
            )

        if not (2 <= len(self.overall_recommendation) <= 3):
            raise ValueError("overall_recommendation must contain 2-3 items")
        return self


class SourceRef(BaseModel):
    policy_label: Literal["A", "B"] = Field(..., description="Which policy this source comes from")
    text: str = Field(..., description="The relevant chunk text")
    section_name: str = Field("", description="Section name from policy document")


class CompareChatRequest(BaseModel):
    business_profile_id: UUID = Field(..., description="UUID of the business profile")
    policy_id_a: UUID = Field(..., description="UUID of the first policy")
    policy_id_b: UUID = Field(..., description="UUID of the second policy")
    session_id: UUID | None = Field(
        None,
        description="Optional recommendation/profiling session used to scope comparison",
    )
    query: str = Field(..., min_length=1, description="User's question about the two policies")
    history: list[dict] = Field(default_factory=list, description="Prior conversation messages")
    top_k: int = Field(5, ge=1, le=20, description="Number of chunks to retrieve per policy")


class CompareChatResponse(BaseModel):
    answer: str = Field(..., description="AI-generated answer grounded in policy chunks")
    sources: list[SourceRef] = Field(default_factory=list, description="Source chunks referenced in the answer")
