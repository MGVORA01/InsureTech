from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Text, JSON, text
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin


class Question(Base, TimestampMixin):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    question_text = Column(Text, nullable=False)
    section = Column(String, nullable=False)
    question_type = Column(String, nullable=False)
    options = Column(JSON)
    applicable_segment = Column(String, nullable=False, server_default=text("'both'::character varying"))
    is_conditional = Column(Boolean, nullable=False, server_default=text("false"))
    parent_question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"))
    parent_answer_value = Column(Text)
    order_index = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))