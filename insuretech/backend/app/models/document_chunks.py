from sqlalchemy import Column, ForeignKey, String, Integer, Text, DateTime, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.shared.base_model import Base


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    policy_id = Column(UUID(as_uuid=True), ForeignKey("policies.id"), nullable=False)
    document_id = Column(String, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(JSONB)
    page_number = Column(Integer)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
