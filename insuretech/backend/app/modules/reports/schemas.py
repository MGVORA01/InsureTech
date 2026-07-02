from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ReportRiskFactorOut(BaseModel):
    name: str
    score: float


class ReportRiskScoreOut(BaseModel):
    risk_category_name: str
    score: float
    risk_level: str
    risk_factors: list[ReportRiskFactorOut] = Field(default_factory=list)


class ReportPolicyOut(BaseModel):
    company_name: str | None = None
    policy_id: UUID | None = None
    policy_name: str | None = None
    recommendation_score: float | None = None
    matched_risk_categories: list[str] = Field(default_factory=list)
    why_recommended: str | None = None
    coverage_summary: str | None = None
    key_benefits: list[str] = Field(default_factory=list)
    important_limitations: list[str] = Field(default_factory=list)
    coverage_highlights: list[str] = Field(default_factory=list)


class ReportBusinessOut(BaseModel):
    id: UUID
    business_name: str
    industry: str | None = None
    segment: str | None = None
    city: str | None = None
    state: str | None = None
    employee_count: int | None = None
    annual_turnover_range: str | None = None


class RiskAdvisoryReportOut(BaseModel):
    report_id: UUID
    session_id: UUID
    report_type: str
    status: str
    generated_at: datetime
    file_url: str | None = None
    business: ReportBusinessOut
    executive_summary: str
    risk_scores: list[ReportRiskScoreOut]
    recommended_policies: list[ReportPolicyOut]
    next_steps: list[str]
    metadata: dict[str, Any] = Field(default_factory=dict)
