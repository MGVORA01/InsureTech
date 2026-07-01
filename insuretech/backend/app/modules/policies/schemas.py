from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field


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
    id: str
    name: str
    irdai_registration_no: str | None = None
    website: str | None = None
    logo_url: str | None = None
    is_active: bool = True


class InsuranceCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    risk_category_id: str | None = None


class InsuranceCategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    risk_category_id: str | None = None


class InsuranceCategoryResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    risk_category_id: str | None = None
    is_active: bool = True


class PolicyCreate(BaseModel):
    insurer_id: str = Field(..., description="UUID of the insurer")
    insurance_category_id: str = Field(..., description="UUID of the insurance category")
    policy_name: str = Field(..., min_length=1, max_length=255)
    policy_number: str | None = None
    min_sum_insured: Decimal | None = None
    max_sum_insured: Decimal | None = None
    key_features: dict | None = None
    target_segment: str | None = None


class PolicyUpdate(BaseModel):
    insurer_id: str | None = None
    insurance_category_id: str | None = None
    policy_name: str | None = Field(None, min_length=1, max_length=255)
    policy_number: str | None = None
    min_sum_insured: Decimal | None = None
    max_sum_insured: Decimal | None = None
    key_features: dict | None = None
    target_segment: str | None = None


class PolicyDocumentResponse(BaseModel):
    id: str
    doc_type: str
    file_name: str
    file_url: str
    file_size: int | None = None
    version: int = 1
    is_active: bool = True
    created_at: datetime | None = None


class PolicyDetailResponse(BaseModel):
    id: str
    insurer_id: str
    insurer_name: str
    insurance_category_id: str
    insurance_category_name: str
    policy_name: str
    policy_number: str | None = None
    min_sum_insured: Decimal | None = None
    max_sum_insured: Decimal | None = None
    key_features: dict | None = None
    target_segment: str | None = None
    is_active: bool = True
    documents: list[PolicyDocumentResponse] = []


class PolicyListResponse(BaseModel):
    id: str
    insurer_id: str
    insurer_name: str
    insurance_category_id: str
    insurance_category_name: str
    policy_name: str
    policy_number: str | None = None
    is_active: bool = True
    documents_count: int = 0


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
