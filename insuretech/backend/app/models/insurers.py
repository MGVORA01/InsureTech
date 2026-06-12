from sqlalchemy import Column, String, Boolean, DateTime, Text, text
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base


class Insurer(Base):
    __tablename__ = "insurers"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String, nullable=False)
    irdai_registration_no = Column(String)
    website = Column(String)
    logo_url = Column(String)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
