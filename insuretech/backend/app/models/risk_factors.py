from sqlalchemy import Column, String, Boolean, Text, Integer, Numeric, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin


class RiskFactor(Base, TimestampMixin):
    __tablename__ = "risk_factors"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    risk_category_id = Column(UUID(as_uuid=True), ForeignKey("risk_categories.id"), nullable=False)
    factor_name = Column(String, nullable=False)
    description = Column(Text)
    weight = Column(Numeric, nullable=False)
    order_index = Column(Integer)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
