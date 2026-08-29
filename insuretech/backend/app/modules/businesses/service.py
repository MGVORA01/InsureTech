"""Business logic layer for the businesses module."""

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.core.logging import get_logger
from app.models import BusinessProfile, User
from app.modules.businesses import repository
from app.modules.businesses.constants import (
    BUSINESSES_FETCHED_MESSAGE,
    BUSINESS_CREATED_LOG_MESSAGE,
    BUSINESS_CREATED_MESSAGE,
    BUSINESS_DELETED_LOG_MESSAGE,
    BUSINESS_DELETED_MESSAGE,
    BUSINESS_FETCHED_MESSAGE,
    BUSINESS_NOT_FOUND_MESSAGE,
    BUSINESS_UPDATED_LOG_MESSAGE,
    BUSINESS_UPDATED_MESSAGE,
    INDUSTRIES_FETCHED_MESSAGE,
    SEGMENTS_FETCHED_MESSAGE,
)
from app.modules.businesses.schemas import (
    BusinessResponse,
    CreateBusinessRequest,
    IndustryOut,
    SegmentOut,
    UpdateBusinessRequest,
)
from app.shared.response import APIResponse

logger = get_logger(__name__)


class BusinessService:
    """Service for business profile operations."""

    async def get_segments(self, db: AsyncSession) -> APIResponse[list[dict[str, Any]]]:
        """Fetch all active segments."""
        segments = await repository.get_all_segments(db)
        return APIResponse.success_response(
            SEGMENTS_FETCHED_MESSAGE,
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
            INDUSTRIES_FETCHED_MESSAGE,
            [IndustryOut.model_validate(i).model_dump() for i in industries],
        )

    async def create_business(
        self,
        data: CreateBusinessRequest,
        user: User,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        """Create a new business profile for the authenticated user."""

        business = await repository.create_business(
            db,
            user.id,
            industry_id=data.industry_id,
            segment_id=data.segment_id,
            business_name=data.business_name,
            business_description=data.business_description,
            city=data.city,
            state=data.state,
            address=data.address,
            pincode=data.pincode,
            year_established=data.year_established,
            employee_count=data.employee_count,
            annual_turnover_range=data.annual_turnover_range,
        )
        await repository.commit(db)
        logger.info(BUSINESS_CREATED_LOG_MESSAGE, user.id)

        return APIResponse.success_response(
            BUSINESS_CREATED_MESSAGE,
            BusinessResponse.model_validate(business).model_dump(),
        )

    async def get_my_business(
        self,
        user: User,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        """Fetch the authenticated user's first/primary business profile."""
        business = await repository.get_business_by_user_id(db, user.id)
        if not business:
            raise NotFoundException(BUSINESS_NOT_FOUND_MESSAGE)

        return APIResponse.success_response(
            BUSINESS_FETCHED_MESSAGE,
            BusinessResponse.model_validate(business).model_dump(),
        )

    async def get_my_businesses(
        self,
        user: User,
        db: AsyncSession,
    ) -> APIResponse[list[dict[str, Any]]]:
        """Fetch all business profiles for the authenticated user."""
        businesses = await repository.get_businesses_by_user_id(db, user.id)
        return APIResponse.success_response(
            BUSINESSES_FETCHED_MESSAGE,
            [BusinessResponse.model_validate(b).model_dump() for b in businesses],
        )

    async def get_my_business_by_id(
        self,
        business_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        """Fetch a specific business profile by ID (ownership verified)."""
        business = await repository.get_business_by_id(db, business_id)
        if not business or business.user_id != user.id:
            raise NotFoundException(BUSINESS_NOT_FOUND_MESSAGE)

        return APIResponse.success_response(
            BUSINESS_FETCHED_MESSAGE,
            BusinessResponse.model_validate(business).model_dump(),
        )

    async def get_business_by_user(
        self,
        user: User,
        db: AsyncSession,
    ) -> BusinessProfile:
        """Fetch the business ORM for cross-module use (profiling, etc.).

        Returns the first active business for the user.
        """
        business = await repository.get_business_by_user_id(db, user.id)
        if not business:
            raise NotFoundException(BUSINESS_NOT_FOUND_MESSAGE)
        return business

    async def get_business_by_id_for_user(
        self,
        business_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> BusinessProfile:
        """Fetch a specific business ORM by ID with ownership verification.

        Used by profiling service for multi-business support.
        """
        business = await repository.get_business_by_id(db, business_id)
        if not business or business.user_id != user.id:
            raise NotFoundException(BUSINESS_NOT_FOUND_MESSAGE)
        return business

    async def get_business_by_id(
        self,
        business_id: UUID,
        db: AsyncSession,
    ) -> BusinessProfile:
        """Fetch a business ORM by ID for cross-module service use."""
        business = await repository.get_business_by_id(db, business_id)
        if not business:
            raise NotFoundException(BUSINESS_NOT_FOUND_MESSAGE)
        return business

    async def update_business(
        self,
        business_id: UUID,
        data: UpdateBusinessRequest,
        user: User,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        """Update an existing business profile (ownership verified)."""
        business = await repository.get_business_by_id(db, business_id)
        if not business or business.user_id != user.id:
            raise NotFoundException(BUSINESS_NOT_FOUND_MESSAGE)

        kwargs = data.model_dump(exclude_none=True, exclude_unset=True)
        updated = await repository.update_business(db, business_id, **kwargs)
        if not updated:
            raise NotFoundException(BUSINESS_NOT_FOUND_MESSAGE)

        await repository.commit(db)
        logger.info(BUSINESS_UPDATED_LOG_MESSAGE, business_id, user.id)

        return APIResponse.success_response(
            BUSINESS_UPDATED_MESSAGE,
            BusinessResponse.model_validate(updated).model_dump(),
        )

    async def delete_business(
        self,
        business_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        """Soft-delete a business profile (ownership verified)."""
        business = await repository.get_business_by_id(db, business_id)
        if not business or business.user_id != user.id:
            raise NotFoundException(BUSINESS_NOT_FOUND_MESSAGE)

        await repository.delete_business(db, business_id)
        await repository.commit(db)
        logger.info(BUSINESS_DELETED_LOG_MESSAGE, business_id, user.id)

        return APIResponse.success_response(
            BUSINESS_DELETED_MESSAGE,
            BusinessResponse.model_validate(business).model_dump(),
        )


Service = BusinessService()
