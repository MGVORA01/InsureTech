from sqlalchemy import Column, ForeignKey, Text, DateTime, Numeric, Boolean, String, text
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    business_id = Column(UUID(as_uuid=True), ForeignKey("business_profiles.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("profiling_sessions.id"), nullable=False)
    insurance_category_id = Column(UUID(as_uuid=True), ForeignKey("insurance_categories.id"), nullable=False)
    risk_category_id = Column(UUID(as_uuid=True), ForeignKey("risk_categories.id"), nullable=False)
    risk_score = Column(Numeric)
    risk_level = Column(String)
    priority = Column(String, nullable=False)
    reason_text = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
