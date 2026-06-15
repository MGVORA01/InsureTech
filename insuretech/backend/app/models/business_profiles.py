from sqlalchemy import Column, String, Boolean, Text, ForeignKey, Integer, text
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin


class BusinessProfile(Base, TimestampMixin):
    __tablename__ = "business_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    industry_id = Column(UUID(as_uuid=True), ForeignKey("industries.id"), nullable=False)
    segment_id = Column(UUID(as_uuid=True), ForeignKey("segments.id"), nullable=False)
    business_name = Column(String, nullable=False)
    business_description = Column(Text)
    city = Column(String)
    state = Column(String)
    address = Column(Text)
    pincode = Column(String)
    year_established = Column(Integer)
    employee_count = Column(Integer)
    annual_turnover_range = Column(String)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))