"""Pydantic schemas for the recommendations module."""

from uuid import UUID

from pydantic import BaseModel, Field


class PolicyDocOut(BaseModel):
    id: UUID
    file_name: str
    file_url: str
    doc_type: str

    model_config = {"from_attributes": True}


class PolicyOut(BaseModel):
    id: UUID
    policy_name: str
    insurer_name: str
    insurer_logo_url: str | None = None
    insurance_category_name: str
    key_features: dict | None = None
    min_sum_insured: float | None = None
    max_sum_insured: float | None = None
    target_segment: str | None = None
    pdf_url: str | None = None
    coverage_highlights: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class SupportingChunkOut(BaseModel):
    chunk_id: UUID
    section_name: str | None = None
    section_type: str | None = None
    chunk_text: str
    matched_risk_categories: list[str] = Field(default_factory=list)


class RecommendationOut(BaseModel):
    priority: str
    risk_category_name: str
    risk_score: float
    risk_level: str
    policies: list[PolicyOut] = Field(default_factory=list)
    company_name: str | None = None
    policy_id: UUID | None = None
    policy_name: str | None = None
    recommendation_score: float | None = None
    coverage_match_count: int = 0
    coverage_match_total: int = 0
    matched_risk_categories: list[str] = Field(default_factory=list)
    additional_inclusions: list[str] = Field(default_factory=list)
    why_recommended: str | None = None
    coverage_summary: str | None = None
    key_benefits: list[str] = Field(default_factory=list)
    important_limitations: list[str] = Field(default_factory=list)
    coverage_highlights: list[str] = Field(default_factory=list)
    supporting_chunks: list[SupportingChunkOut] = Field(default_factory=list)


class RiskScoreOut(BaseModel):
    risk_category_name: str
    score: float
    risk_level: str
    factor_breakdown: dict[str, float] | None = None


class RecommendationListOut(BaseModel):
    session_id: UUID
    business_profile_id: UUID | None = None
    scores: list[RiskScoreOut]
    recommendations: list[RecommendationOut]


class RecommendationDownloadOut(BaseModel):
    policy_id: UUID
    file_name: str
    download_url: str


class PolicyListOut(BaseModel):
    id: UUID
    policy_name: str
    insurer_name: str
    insurer_logo_url: str | None = None
    insurance_category_name: str
    key_features: dict | None = None
    min_sum_insured: float | None = None
    max_sum_insured: float | None = None
    target_segment: str | None = None

    model_config = {"from_attributes": True}


class PolicyDetailOut(PolicyListOut):
    pdf_url: str | None = None
    documents: list[PolicyDocOut] = []


class PaginatedPolicyListOut(BaseModel):
    policies: list[PolicyListOut]
    total: int
    page: int
    limit: int
