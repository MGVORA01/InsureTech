"""Route definitions for the recommendations module."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.models import User
from app.modules.recommendations.service import Service
from app.shared.dependency.get_current_user import get_current_user
from app.shared.response import APIResponse

router = APIRouter(
    prefix="/recommendations",
    tags=["recommendations"],
)


@router.get("/{session_id}", status_code=status.HTTP_200_OK)
async def get_recommendations(
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Fetch existing recommendations for a completed profiling session."""
    return await Service.get_recommendations(session_id, current_user, db)


@router.post("/{session_id}/generate", status_code=status.HTTP_200_OK)
async def generate_recommendations(
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Generate policy recommendations based on risk scores.

    Uses a hybrid approach:
    1. Rule-based: maps risk categories → insurance categories → policies
    2. Semantic: enriches with document chunk highlights
    """
    return await Service.generate_recommendations(session_id, current_user, db)


@router.get(
    "/{session_id}/policies/{policy_id}/download",
    status_code=status.HTTP_200_OK,
)
async def get_recommended_policy_download(
    session_id: UUID,
    policy_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Fetch a downloadable PDF URL for a policy in this recommendation session."""
    return await Service.get_policy_download(session_id, policy_id, current_user, db)
