from sqlalchemy import Column, ForeignKey, Text, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin


class ProfilingAnswer(Base, TimestampMixin):
    __tablename__ = "profiling_answers"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    session_id = Column(UUID(as_uuid=True), ForeignKey("profiling_sessions.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    answer_value = Column(Text, nullable=False)

    session = relationship("ProfilingSession", back_populates="answers")
    question = relationship("Question", back_populates="profiling_answers")