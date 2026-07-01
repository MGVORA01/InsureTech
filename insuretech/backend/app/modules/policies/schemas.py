"""Pydantic schemas for the policies module."""

from uuid import UUID

from pydantic import BaseModel


class PolicyDocumentOut(BaseModel):
    id: UUID
    file_name: str
    file_url: str
    doc_type: str
    version: int

    model_config = {"from_attributes": True}


class PolicyDetailOut(BaseModel):
    id: UUID
    policy_name: str
    insurer_name: str
    insurer_logo_url: str | None = None
    insurance_category_name: str
    key_features: dict | None = None
    min_sum_insured: float | None = None
    max_sum_insured: float | None = None
    target_segment: str | None = None
    documents: list[PolicyDocumentOut] = []

    model_config = {"from_attributes": True}


class PolicyListItemOut(BaseModel):
    id: UUID
    policy_name: str
    insurer_name: str
    insurer_logo_url: str | None = None
    insurance_category_name: str

    model_config = {"from_attributes": True}


class PaginatedPolicyListOut(BaseModel):
    policies: list[PolicyListItemOut]
    total: int
    page: int
    limit: int
