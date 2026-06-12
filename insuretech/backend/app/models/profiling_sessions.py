from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, text
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base


class ProfilingSession(Base):
    __tablename__ = "profiling_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    business_id = Column(UUID(as_uuid=True), ForeignKey("business_profiles.id"), nullable=False)
    status = Column(String, nullable=False, server_default=text("'in_progress'::character varying"))
    current_section = Column(String)
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
