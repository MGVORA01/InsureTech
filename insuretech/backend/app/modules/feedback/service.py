from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.core.logging import get_logger
from app.models import User
from app.modules.businesses.service import Service as BusinessService
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
        business_id: UUID | None = None,
    ) -> APIResponse:
        if business_id:
            business = await BusinessService.get_business_by_id_for_user(business_id, user, db)
        else:
            business = await BusinessService.get_business_by_user(user, db)

        feedback = await repository.create_feedback(db, user.id, business.id, data)
        await db.commit()
        logger.info("Feedback %s submitted for business %s by user %s", feedback.id, business.id, user.id)
        return APIResponse.success_response(
            "Feedback submitted successfully",
            FeedbackResponse.model_validate(feedback).model_dump(),
        )

    async def list_business_feedbacks(
        self,
        user: User,
        db: AsyncSession,
        business_id: UUID | None = None,
    ) -> APIResponse:
        if business_id:
            business = await BusinessService.get_business_by_id_for_user(business_id, user, db)
        else:
            business = await BusinessService.get_business_by_user(user, db)

        feedbacks = await repository.get_business_feedbacks(db, business.id)
        return APIResponse.success_response(
            "Feedbacks fetched successfully",
            [FeedbackResponse.model_validate(f).model_dump() for f in feedbacks],
        )


Service = _FeedbackService()
