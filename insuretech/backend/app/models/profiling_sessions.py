from sqlalchemy import Column, String, DateTime, ForeignKey, text
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