from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.models import User
from app.modules.feedback.schemas import CreateFeedbackRequest
from app.modules.feedback.service import Service
from app.shared.dependency.get_current_user import get_current_user
from app.shared.response import APIResponse

router = APIRouter(
    prefix="/feedback",
    tags=["feedback"],
)


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    data: CreateFeedbackRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    return await Service.submit_feedback(data, current_user, db)


@router.get("", status_code=status.HTTP_200_OK)
async def list_my_feedbacks(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    return await Service.list_my_feedbacks(current_user, db)
