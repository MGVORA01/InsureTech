from sqlalchemy import Column, String, Boolean, Text, ForeignKey, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin


class InsuranceCategory(Base, TimestampMixin):
    __tablename__ = "insurance_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    risk_category_id = Column(UUID(as_uuid=True), ForeignKey("risk_categories.id"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    risk_category = relationship("RiskCategory", back_populates="insurance_categories")
    policies = relationship("Policy", back_populates="insurance_category")
    recommendations = relationship("Recommendation", back_populates="insurance_category")
