"""Pydantic schemas for the recommendations module."""

from uuid import UUID

from pydantic import BaseModel


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
    coverage_highlights: list[str] = []

    model_config = {"from_attributes": True}


class RecommendationOut(BaseModel):
    priority: str
    risk_category_name: str
    risk_score: float
    risk_level: str
    policies: list[PolicyOut] = []


class RiskScoreOut(BaseModel):
    risk_category_name: str
    score: float
    risk_level: str
    factor_breakdown: dict[str, float] | None = None


class RecommendationListOut(BaseModel):
    session_id: UUID
    scores: list[RiskScoreOut]
    recommendations: list[RecommendationOut]


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
