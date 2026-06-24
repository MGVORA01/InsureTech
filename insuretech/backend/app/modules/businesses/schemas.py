"""Pydantic schemas for the businesses module."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SegmentOut(BaseModel):
    """Schema for segment response."""

    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class IndustryOut(BaseModel):
    """Schema for industry response."""

    id: UUID
    name: str
    segment_id: UUID

    model_config = ConfigDict(from_attributes=True)


class CreateBusinessRequest(BaseModel):
    """Schema for creating a new business profile."""

    industry_id: UUID
    segment_id: UUID
    business_name: str = Field(min_length=1)
    business_description: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    year_established: Optional[int] = None
    employee_count: Optional[int] = None
    annual_turnover_range: Optional[str] = None


class BusinessResponse(BaseModel):
    """Schema for business profile response."""

    id: UUID
    user_id: UUID
    industry_id: UUID
    segment_id: UUID
    business_name: str
    business_description: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    year_established: Optional[int] = None
    employee_count: Optional[int] = None
    annual_turnover_range: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
