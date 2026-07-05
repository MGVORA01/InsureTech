from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.models import User
from app.modules.policy_comparison.constants import (
    COMPARE_CHAT_ROUTE,
    COMPARE_PREFIX,
    COMPARE_ROUTE,
    COMPARE_TAG,
)
from app.modules.policy_comparison.schemas import CompareChatRequest, CompareRequest
from app.modules.policy_comparison.service import Service
from app.shared.dependency.get_current_user import get_current_user
from app.shared.response import APIResponse

router = APIRouter(prefix=COMPARE_PREFIX, tags=[COMPARE_TAG])


@router.post(COMPARE_ROUTE, status_code=status.HTTP_200_OK)
async def compare_policies(
    body: CompareRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Compare two policies."""
    return await Service.compare(db, user, body)


@router.post(COMPARE_CHAT_ROUTE, status_code=status.HTTP_200_OK)
async def compare_chat(
    body: CompareChatRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Chat about two compared policies."""
    return await Service.chat(db, user, body)
