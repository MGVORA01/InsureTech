from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Text, JSON, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin


class Question(Base, TimestampMixin):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    unified_id = Column(String, nullable=False, unique=True)
    question_text = Column(Text, nullable=False)
    section = Column(String, nullable=False)
    question_type = Column(String, nullable=False)
    options = Column(JSON)
    legacy_metadata = Column(JSON)
    applicable_segment = Column(String, nullable=False, server_default=text("'both'::character varying"))
    is_conditional = Column(Boolean, nullable=False, server_default=text("false"))
    parent_question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"))
    parent_answer_value = Column(Text)
    order_index = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    parent_question = relationship("Question", remote_side="Question.id", back_populates="child_questions")
    child_questions = relationship("Question", back_populates="parent_question")
    factor_mappings = relationship("QuestionFactorMapping", back_populates="question")
    answer_score_rules = relationship("AnswerScoreRule", back_populates="question")
    profiling_answers = relationship("ProfilingAnswer", back_populates="question")
