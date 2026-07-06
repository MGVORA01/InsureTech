"""Database access layer for feedback workflows."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Feedback
from app.shared import base_repository as Base


async def create_feedback(
    db: AsyncSession,
    user_id: UUID,
    business_id: UUID,
    message: str,
    rating: int | None = None,
    recommendations_helpful: bool | None = None,
) -> Feedback:
    """Create a feedback record.

    Args:
        db: Active database session.
        user_id: ID of the user submitting feedback.
        business_id: ID of the business receiving feedback.
        message: Feedback message text.
        rating: Optional numeric rating.
        recommendations_helpful: Whether recommendations were helpful.

    Returns:
        The newly created feedback record.
    """
    return await Base.create(
        db,
        Feedback,
        user_id=user_id,
        business_id=business_id,
        message=message,
        rating=rating,
        recommendations_helpful=recommendations_helpful,
    )


async def get_business_feedbacks(
    db: AsyncSession,
    business_id: UUID,
) -> list[Feedback]:
    """Fetch feedback records for a business.

    Args:
        db: Active database session.
        business_id: ID of the business whose feedback is requested.

    Returns:
        Feedback records ordered newest first.
    """
    result = await db.execute(
        select(Feedback)
        .where(Feedback.business_id == business_id)
        .order_by(Feedback.created_at.desc())
    )
    return list(result.scalars().all())
