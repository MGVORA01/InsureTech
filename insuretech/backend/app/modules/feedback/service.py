"""Service layer for feedback workflows."""

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models import User
from app.modules.businesses.service import Service as BusinessService
from app.modules.feedback import repository
from app.modules.feedback.constants import (
    FEEDBACK_SUBMITTED_LOG_MESSAGE,
    FEEDBACK_SUBMITTED_MESSAGE,
    FEEDBACKS_FETCHED_MESSAGE,
)
from app.modules.feedback.schemas import CreateFeedbackRequest, FeedbackResponse
from app.shared.response import APIResponse

logger = get_logger(__name__)


class FeedbackService:
    """Service for feedback workflows."""

    def __init__(self, business_service=None):
        self._business_service = business_service or BusinessService

    async def submit_feedback(
        self,
        data: CreateFeedbackRequest,
        user: User,
        db: AsyncSession,
        business_id: UUID | None = None,
    ) -> APIResponse[dict[str, Any]]:
        """Submit feedback for the user's business."""
        if business_id:
            business = await self._business_service.get_business_by_id_for_user(
                business_id, user, db
            )
        else:
            business = await self._business_service.get_business_by_user(user, db)

        feedback = await repository.create_feedback(
            db, user.id, business.id,
            message=data.message,
            rating=data.rating,
            recommendations_helpful=data.recommendations_helpful,
        )
        await repository.commit(db)
        logger.info(
            FEEDBACK_SUBMITTED_LOG_MESSAGE,
            feedback.id,
            business.id,
            user.id,
        )
        return APIResponse.success_response(
            FEEDBACK_SUBMITTED_MESSAGE,
            FeedbackResponse.model_validate(feedback).model_dump(),
        )

    async def list_business_feedbacks(
        self,
        user: User,
        db: AsyncSession,
        business_id: UUID | None = None,
    ) -> APIResponse[list[dict[str, Any]]]:
        """List feedback for the user's business."""
        if business_id:
            business = await self._business_service.get_business_by_id_for_user(
                business_id, user, db
            )
        else:
            business = await self._business_service.get_business_by_user(user, db)

        feedbacks = await repository.get_business_feedbacks(db, business.id)
        return APIResponse.success_response(
            FEEDBACKS_FETCHED_MESSAGE,
            [FeedbackResponse.model_validate(f).model_dump() for f in feedbacks],
        )


Service = FeedbackService()
