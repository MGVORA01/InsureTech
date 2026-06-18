from sqlalchemy import Column, ForeignKey, String, Integer, Text, DateTime, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.shared.base_model import Base
from pgvector.sqlalchemy import Vector


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    policy_id = Column(UUID(as_uuid=True), ForeignKey("policies.id"), nullable=False)
    document_id = Column(String, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(768))  # Adjust dimensionality as needed
    page_number = Column(Integer)
    document_metadata = Column(JSONB, nullable=True) 
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    policy = relationship("Policy", back_populates="document_chunks")
