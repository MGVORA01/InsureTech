from decimal import Decimal
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InsurerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    irdai_registration_no: str | None = None
    website: str | None = None
    logo_url: str | None = None


class InsurerUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    irdai_registration_no: str | None = None
    website: str | None = None
    logo_url: str | None = None


class InsurerResponse(BaseModel):
    id: UUID
    name: str
    irdai_registration_no: str | None = None
    website: str | None = None
    logo_url: str | None = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class InsuranceCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    risk_category_id: UUID | None = None


class InsuranceCategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    risk_category_id: UUID | None = None


class InsuranceCategoryResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    risk_category_id: UUID | None = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class PolicyCreate(BaseModel):
    insurer_id: UUID
    insurance_category_id: UUID
    policy_name: str = Field(..., min_length=1, max_length=255)
    policy_number: str | None = None
    min_sum_insured: Decimal | None = None
    max_sum_insured: Decimal | None = None
    key_features: dict | None = None
    target_segment: str | None = None


class PolicyUpdate(BaseModel):
    insurer_id: UUID | None = None
    insurance_category_id: UUID | None = None
    policy_name: str | None = Field(None, min_length=1, max_length=255)
    policy_number: str | None = None
    min_sum_insured: Decimal | None = None
    max_sum_insured: Decimal | None = None
    key_features: dict | None = None
    target_segment: str | None = None


class PolicyDocumentResponse(BaseModel):
    id: UUID
    doc_type: str
    file_name: str
    file_url: str
    file_size: int | None = None
    version: int = 1
    is_active: bool = True
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PolicyDetailResponse(BaseModel):
    id: UUID
    insurer_id: UUID
    insurer_name: str
    insurance_category_id: UUID
    insurance_category_name: str
    policy_name: str
    policy_number: str | None = None
    min_sum_insured: Decimal | None = None
    max_sum_insured: Decimal | None = None
    key_features: dict | None = None
    target_segment: str | None = None
    is_active: bool = True
    documents: list[PolicyDocumentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PolicyListResponse(BaseModel):
    id: UUID
    insurer_id: UUID
    insurer_name: str
    insurance_category_id: UUID
    insurance_category_name: str
    policy_name: str
    policy_number: str | None = None
    is_active: bool = True
    documents_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class PaginatedPolicyResponse(BaseModel):
    items: list[PolicyListResponse]
    total: int
    page: int
    limit: int


class PolicyUploadResponse(BaseModel):
    document_id: str
    file_name: str
    file_url: str
    chunks_count: int
