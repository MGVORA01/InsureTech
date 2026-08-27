from sqlalchemy import Column, String, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin


class ProfilingSession(Base, TimestampMixin):
    __tablename__ = "profiling_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    business_id = Column(UUID(as_uuid=True), ForeignKey("business_profiles.id"), nullable=False)
    status = Column(String, nullable=False, server_default=text("'in_progress'::character varying"))
    current_section = Column(String)
    completed_at = Column(DateTime(timezone=True))

    business_profile = relationship("BusinessProfile", back_populates="profiling_sessions")
    answers = relationship("ProfilingAnswer", back_populates="session")
    risk_scores = relationship("BusinessRiskScore", back_populates="session")
    recommendations = relationship("Recommendation", back_populates="session")
    reports = relationship("Report", back_populates="session")