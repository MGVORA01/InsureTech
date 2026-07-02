from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.core.logging import get_logger
from app.models import User
from app.modules.feedback import repository
from app.modules.feedback.schemas import CreateFeedbackRequest, FeedbackResponse
from app.shared.response import APIResponse

logger = get_logger(__name__)


class _FeedbackService:

    async def submit_feedback(
        self,
        data: CreateFeedbackRequest,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        feedback = await repository.create_feedback(db, user.id, data)
        await db.commit()
        logger.info("Feedback %s submitted by user %s", feedback.id, user.id)
        return APIResponse.success_response(
            "Feedback submitted successfully",
            FeedbackResponse.model_validate(feedback).model_dump(),
        )

    async def list_my_feedbacks(
        self,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        feedbacks = await repository.get_user_feedbacks(db, user.id)
        return APIResponse.success_response(
            "Feedbacks fetched successfully",
            [FeedbackResponse.model_validate(f).model_dump() for f in feedbacks],
        )


Service = _FeedbackService()
