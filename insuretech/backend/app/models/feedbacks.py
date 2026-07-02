from sqlalchemy import Column, String, Text, Integer, ForeignKey, text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.shared.base_model import Base
from app.models.audit_log import TimestampMixin


class Feedback(Base, TimestampMixin):
    __tablename__ = "feedbacks"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    rating = Column(Integer, nullable=False)
    recommendations_helpful = Column(String(50))
    status = Column(String(20), nullable=False, server_default=text("'pending'"))

    user = relationship("User", back_populates="feedbacks")
