import uuid
from datetime import datetime
from sqlalchemy import (
    Column, ForeignKey, String, Integer,
    Text, Boolean, DateTime, text, func
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.shared.base_model import Base


class PolicyDocument(Base):
    __tablename__ = "policy_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    policy_id = Column(UUID(as_uuid=True), ForeignKey("policies.id", ondelete="CASCADE"), nullable=False)
    insurer_id = Column(UUID(as_uuid=True), ForeignKey("insurers.id"), nullable=False)
    doc_type = Column(String(30), nullable=False)
    file_name   = Column(String(255), nullable=False)
    file_url    = Column(Text, nullable=False)        
    file_size   = Column(Integer)                     
    version    = Column(Integer, nullable=False, server_default=text("1"))
    is_active    = Column(Boolean, nullable=False, server_default=text("true"))
    created_at   = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at   = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=func.now())

    # Relationships
    policy  = relationship("Policy",  back_populates="documents")
    insurer = relationship("Insurer", back_populates="documents")
    chunks  = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")