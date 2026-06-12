from sqlalchemy import Column, ForeignKey, String, Boolean, DateTime, Text, Numeric, JSON, text
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base


class Policy(Base):
    __tablename__ = "policies"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    insurer_id = Column(UUID(as_uuid=True), ForeignKey("insurers.id"), nullable=False)
    insurance_category_id = Column(UUID(as_uuid=True), ForeignKey("insurance_categories.id"), nullable=False)
    policy_name = Column(String, nullable=False)
    policy_number = Column(String)
    min_sum_insured = Column(Numeric)
    max_sum_insured = Column(Numeric)
    key_features = Column(JSON)
    target_segment = Column(String)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
