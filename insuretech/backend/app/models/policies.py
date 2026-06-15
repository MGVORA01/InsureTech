from sqlalchemy import Column, ForeignKey, String, Boolean, Numeric, JSON, text
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin


class Policy(Base, TimestampMixin):
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