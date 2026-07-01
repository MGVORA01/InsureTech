from sqlalchemy import Column, ForeignKey, Text, Boolean, Numeric, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin


class AnswerScoreRule(Base, TimestampMixin):
    __tablename__ = "answer_score_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    risk_factor_id = Column(UUID(as_uuid=True), ForeignKey("risk_factors.id"), nullable=False)
    answer_value = Column(Text, nullable=False)
    score = Column(Numeric, nullable=False)
    weight = Column(Numeric, nullable=False, server_default=text("1.0"))
    description = Column(Text)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    question = relationship("Question", back_populates="answer_score_rules")
    risk_factor = relationship("RiskFactor", back_populates="answer_score_rules")