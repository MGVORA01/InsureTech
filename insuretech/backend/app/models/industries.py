from sqlalchemy import Column, String, Boolean, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import AuditMixin, TimestampMixin


class Industry(Base, AuditMixin, TimestampMixin):
    __tablename__ = "industries"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String, nullable=False)
    segment_id = Column(UUID(as_uuid=True), ForeignKey("segments.id"), nullable=False)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))