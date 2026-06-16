from sqlalchemy import Column, String, Boolean, Text, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import AuditMixin, TimestampMixin

class Segment(Base, AuditMixin, TimestampMixin):
    __tablename__ = "segments"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    industries = relationship("Industry", back_populates="segment")
    business_profiles = relationship("BusinessProfile", back_populates="segment")

    created_by_user = relationship("User", foreign_keys="Segment.created_by", backref="created_segments")
    updated_by_user = relationship("User", foreign_keys="Segment.updated_by", backref="updated_segments")