from sqlalchemy import Column, ForeignKey, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base


class QuestionFactorMapping(Base):
    __tablename__ = "question_factor_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    risk_factor_id = Column(UUID(as_uuid=True), ForeignKey("risk_factors.id"), nullable=False)

    question = relationship("Question", back_populates="factor_mappings")
    risk_factor = relationship("RiskFactor", back_populates="question_mappings")
