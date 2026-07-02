from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Feedback
from app.modules.feedback.schemas import CreateFeedbackRequest


async def create_feedback(
    db: AsyncSession,
    user_id: UUID,
    business_id: UUID,
    data: CreateFeedbackRequest,
) -> Feedback:
    feedback = Feedback(
        user_id=user_id,
        business_id=business_id,
        message=data.message,
        rating=data.rating,
        recommendations_helpful=data.recommendations_helpful,
    )
    db.add(feedback)
    await db.flush()
    await db.refresh(feedback)
    return feedback


async def get_business_feedbacks(
    db: AsyncSession,
    business_id: UUID,
) -> list[Feedback]:
    result = await db.execute(
        select(Feedback)
        .where(Feedback.business_id == business_id)
        .order_by(Feedback.created_at.desc())
    )
    return list(result.scalars().all())
