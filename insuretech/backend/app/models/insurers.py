from sqlalchemy import Column, String, Boolean, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin


class Insurer(Base, TimestampMixin):
    __tablename__ = "insurers"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String, nullable=False)
    irdai_registration_no = Column(String)
    website = Column(String)
    logo_url = Column(String)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    policies = relationship("Policy", back_populates="insurer")
    documents = relationship("PolicyDocument", back_populates="insurer", cascade="all, delete-orphan")