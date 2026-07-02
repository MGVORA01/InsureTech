from sqlalchemy import Column, String, Boolean, ForeignKey, Text, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    role = relationship("Role", back_populates="users")
    business_profiles = relationship("BusinessProfile", back_populates="user")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user")
    feedbacks = relationship("Feedback", back_populates="user")
