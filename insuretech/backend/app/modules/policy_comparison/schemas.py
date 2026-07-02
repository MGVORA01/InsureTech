from typing import Literal
from uuid import UUID
from pydantic import BaseModel, Field


class CompareRequest(BaseModel):
    business_profile_id: UUID = Field(..., description="UUID of the business profile")
    policy_id_a: UUID = Field(..., description="UUID of the first policy")
    policy_id_b: UUID = Field(..., description="UUID of the second policy")


class ComparisonItem(BaseModel):
    category: str = Field(..., description="Section category: coverage, exclusions, claims, financial, conditions")
    policy_a_value: str = Field(..., description="Relevant content from policy A for this category")
    policy_b_value: str = Field(..., description="Relevant content from policy B for this category")
    stronger: Literal["a", "b", "equal", "insufficient_evidence"] = Field(
        ..., description="Which policy is stronger in this category"
    )
    evidence: str = Field(..., description="Quoted evidence from retrieved chunks supporting the comparison")
    confidence: Literal["high", "medium", "low"] = Field(
        ..., description="Confidence based on retrieved evidence"
    )


class CompareResponse(BaseModel):
    executive_summary: str = Field(..., description="Brief summary of the comparison")
    comparisons: list[ComparisonItem] = Field(..., description="Section-by-section comparisons")
    coverage_gap_analysis: str = Field(..., description="Which coverages are present/missing in each policy")
    business_risk_alignment: str = Field(..., description="How each policy aligns with the business risk profile")
    advantages_a: list[str] = Field(..., description="Key advantages of policy A")
    advantages_b: list[str] = Field(..., description="Key advantages of policy B")
    limitations_a: list[str] = Field(..., description="Key limitations of policy A")
    limitations_b: list[str] = Field(..., description="Key limitations of policy B")
    overall_recommendation: str = Field(..., description="Evidence-based overall recommendation")
    missing_information: list[str] = Field(..., description="Information not found in retrieved policy sections")
    overall_confidence: Literal["high", "medium", "low"] = Field(
        ..., description="Overall confidence across all comparisons"
    )


class SourceRef(BaseModel):
    policy_label: Literal["A", "B"] = Field(..., description="Which policy this source comes from")
    text: str = Field(..., description="The relevant chunk text")
    section_name: str = Field("", description="Section name from policy document")


class CompareChatRequest(BaseModel):
    business_profile_id: UUID = Field(..., description="UUID of the business profile")
    policy_id_a: UUID = Field(..., description="UUID of the first policy")
    policy_id_b: UUID = Field(..., description="UUID of the second policy")
    query: str = Field(..., min_length=1, description="User's question about the two policies")
    history: list[dict] = Field(default_factory=list, description="Prior conversation messages")
    top_k: int = Field(5, ge=1, le=20, description="Number of chunks to retrieve per policy")


class CompareChatResponse(BaseModel):
    answer: str = Field(..., description="AI-generated answer grounded in policy chunks")
    sources: list[SourceRef] = Field(default_factory=list, description="Source chunks referenced in the answer")
