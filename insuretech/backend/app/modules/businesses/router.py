"""Route definitions for the businesses module."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.models import User
from app.modules.businesses.schemas import CreateBusinessRequest
from app.modules.businesses.service import Service
from app.shared.dependency.get_current_user import get_current_user
from app.shared.response import APIResponse

router = APIRouter(
    prefix="/businesses",
    tags=["businesses"],
)


@router.get("/segments", status_code=status.HTTP_200_OK)
async def get_segments(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Fetch all active market segments."""
    return await Service.get_segments(db)


@router.get("/industries", status_code=status.HTTP_200_OK)
async def get_industries(
    segment_id: Annotated[UUID, Query(...)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Fetch active industries for a given segment."""
    return await Service.get_industries(segment_id, db)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_business(
    data: CreateBusinessRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Create a new business profile for the authenticated user."""
    return await Service.create_business(data, current_user, db)


@router.get("/me", status_code=status.HTTP_200_OK)
async def get_my_business(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Fetch the authenticated user's business profile."""
    return await Service.get_my_business(current_user, db)
