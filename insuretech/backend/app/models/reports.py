from sqlalchemy import Column, ForeignKey, String, Text, DateTime, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin


class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    business_id = Column(UUID(as_uuid=True), ForeignKey("business_profiles.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("profiling_sessions.id"))
    report_type = Column(String, nullable=False)
    file_url = Column(Text)
    status = Column(String, nullable=False, server_default=text("'pending'::character varying"))
    error_message = Column(Text)
    generated_at = Column(DateTime(timezone=True))

    business_profile = relationship("BusinessProfile", back_populates="reports")
    session = relationship("ProfilingSession", back_populates="reports")