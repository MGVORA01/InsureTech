"""Route definitions for the businesses module."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.models import User
from app.modules.businesses.constants import (
    BUSINESSES_PREFIX,
    BUSINESSES_TAG,
    BUSINESSES_ROUTE,
    BUSINESS_DETAIL_ROUTE,
    INDUSTRIES_ROUTE,
    MY_BUSINESS_ROUTE,
    SEGMENTS_ROUTE,
)
from app.modules.businesses.schemas import CreateBusinessRequest
from app.modules.businesses.service import Service
from app.shared.dependency.get_current_user import get_current_user
from app.shared.response import APIResponse

router = APIRouter(
    prefix=BUSINESSES_PREFIX,
    tags=[BUSINESSES_TAG],
)


@router.get(SEGMENTS_ROUTE, status_code=status.HTTP_200_OK)
async def get_segments(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Fetch all active market segments."""
    return await Service.get_segments(db)


@router.get(INDUSTRIES_ROUTE, status_code=status.HTTP_200_OK)
async def get_industries(
    segment_id: Annotated[UUID, Query(...)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Fetch active industries for a given segment."""
    return await Service.get_industries(segment_id, db)


@router.post(BUSINESSES_ROUTE, status_code=status.HTTP_201_CREATED)
async def create_business(
    data: CreateBusinessRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Create a new business profile for the authenticated user."""
    return await Service.create_business(data, current_user, db)


@router.get(BUSINESSES_ROUTE, status_code=status.HTTP_200_OK)
async def get_my_businesses(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Fetch all business profiles for the authenticated user."""
    return await Service.get_my_businesses(current_user, db)


@router.get(MY_BUSINESS_ROUTE, status_code=status.HTTP_200_OK)
async def get_my_business(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Fetch the authenticated user's first/primary business profile."""
    return await Service.get_my_business(current_user, db)


@router.get(BUSINESS_DETAIL_ROUTE, status_code=status.HTTP_200_OK)
async def get_business_by_id(
    business_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Fetch a specific business profile by ID (ownership verified)."""
    return await Service.get_my_business_by_id(business_id, current_user, db)


@router.delete(BUSINESS_DETAIL_ROUTE, status_code=status.HTTP_200_OK)
async def delete_business(
    business_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Soft-delete a business profile (ownership verified)."""
    return await Service.delete_business(business_id, current_user, db)
