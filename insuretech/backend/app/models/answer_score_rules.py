from sqlalchemy import Column, ForeignKey, Text, Boolean, DateTime, Numeric, text
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base


class AnswerScoreRule(Base):
    __tablename__ = "answer_score_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    risk_factor_id = Column(UUID(as_uuid=True), ForeignKey("risk_factors.id"), nullable=False)
    answer_value = Column(Text, nullable=False)
    score = Column(Numeric, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
