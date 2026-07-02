from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CreateFeedbackRequest(BaseModel):
    message: str = Field(..., min_length=1)
    rating: int = Field(..., ge=1, le=5)
    recommendations_helpful: Optional[str] = Field(
        None, pattern=r"^(very_useful|useful|neutral|not_useful)$"
    )


class FeedbackResponse(BaseModel):
    id: UUID
    user_id: UUID
    business_id: UUID
    message: str
    rating: int
    recommendations_helpful: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
