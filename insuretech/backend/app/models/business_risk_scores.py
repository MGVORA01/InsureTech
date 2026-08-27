from sqlalchemy import Column, ForeignKey, Text, DateTime, Numeric, JSON, String, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base


class BusinessRiskScore(Base):
    __tablename__ = "business_risk_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    business_id = Column(UUID(as_uuid=True), ForeignKey("business_profiles.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("profiling_sessions.id"), nullable=False)
    risk_category_id = Column(UUID(as_uuid=True), ForeignKey("risk_categories.id"), nullable=False)
    score = Column(Numeric, nullable=False)
    risk_level = Column(String, nullable=False)
    factor_breakdown = Column(JSON)
    calculated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    business_profile = relationship("BusinessProfile", back_populates="risk_scores")
    session = relationship("ProfilingSession", back_populates="risk_scores")
    risk_category = relationship("RiskCategory", back_populates="business_risk_scores")
