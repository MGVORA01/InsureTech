"""Business logic layer for the businesses module."""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.core.logging import get_logger
from app.models import User
from app.modules.businesses import repository
from app.modules.businesses.schemas import BusinessResponse, CreateBusinessRequest, IndustryOut, SegmentOut
from app.shared.response import APIResponse

logger = get_logger(__name__)


class _BusinessService:
    """Service for business profile operations."""

    async def get_segments(self, db: AsyncSession) -> APIResponse[list[dict[str, Any]]]:
        """Fetch all active segments."""
        segments = await repository.get_all_segments(db)
        return APIResponse.success_response(
            "Segments fetched successfully",
            [SegmentOut.model_validate(s).model_dump() for s in segments],
        )

    async def get_industries(
        self,
        segment_id: Any,
        db: AsyncSession,
    ) -> APIResponse[list[dict[str, Any]]]:
        """Fetch industries for a given segment."""
        industries = await repository.get_industries_by_segment(db, segment_id)
        return APIResponse.success_response(
            "Industries fetched successfully",
            [IndustryOut.model_validate(i).model_dump() for i in industries],
        )

    async def create_business(
        self,
        data: CreateBusinessRequest,
        user: User,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        """Create a new business profile for the authenticated user."""
        existing = await repository.get_business_by_user_id(db, user.id)
        if existing:
            raise ConflictException("Business profile already exists")

        business = await repository.create_business(db, user.id, data)
        logger.info("Business profile created for user %s", user.id)

        return APIResponse.success_response(
            "Business profile created successfully",
            BusinessResponse.model_validate(business).model_dump(),
        )

    async def get_my_business(
        self,
        user: User,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        """Fetch the authenticated user's business profile."""
        business = await repository.get_business_by_user_id(db, user.id)
        if not business:
            raise NotFoundException("Business profile not found")

        return APIResponse.success_response(
            "Business profile fetched successfully",
            BusinessResponse.model_validate(business).model_dump(),
        )


Service = _BusinessService()
