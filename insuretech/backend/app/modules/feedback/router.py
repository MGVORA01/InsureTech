from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.models import User
from app.modules.feedback.constants import FEEDBACK_PREFIX, FEEDBACK_TAG, FEEDBACK_ROUTE
from app.modules.feedback.schemas import CreateFeedbackRequest
from app.modules.feedback.service import Service
from app.shared.dependency.get_current_user import get_current_user
from app.shared.response import APIResponse

router = APIRouter(
    prefix=FEEDBACK_PREFIX,
    tags=[FEEDBACK_TAG],
)


@router.post(FEEDBACK_ROUTE, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    data: CreateFeedbackRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    business_id: Annotated[UUID | None, Query()] = None,
) -> APIResponse:
    """Submit feedback for the user's business."""
    return await Service.submit_feedback(data, current_user, db, business_id=business_id)


@router.get(FEEDBACK_ROUTE, status_code=status.HTTP_200_OK)
async def list_business_feedbacks(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    business_id: Annotated[UUID | None, Query()] = None,
) -> APIResponse:
    """List feedback for the user's business."""
    return await Service.list_business_feedbacks(current_user, db, business_id=business_id)
