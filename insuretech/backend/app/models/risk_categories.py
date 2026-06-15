from sqlalchemy import Column, String, Boolean, Text, text
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin

class RiskCategory(Base, TimestampMixin):
    __tablename__ = "risk_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))