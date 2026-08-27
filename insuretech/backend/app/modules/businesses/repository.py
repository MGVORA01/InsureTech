"""Database access layer for the businesses module."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import BusinessProfile, Industry, Segment
from app.shared import base_repository as Base


async def commit(db: AsyncSession) -> None:
    """Commit the current transaction on the session."""
    await Base.commit(db)


async def get_all_segments(db: AsyncSession) -> list[Segment]:
    """Fetch all active segments ordered by name.

    Returns:
        List of active Segment ORM instances.
    """
    result = await db.execute(
        select(Segment).where(Segment.is_active.is_(True)).order_by(Segment.name)
    )
    return list(result.scalars().all())


async def get_industries_by_segment(
    db: AsyncSession, segment_id: UUID
) -> list[Industry]:
    """Fetch active industries for a given segment.

    Args:
        segment_id: UUID of the segment to filter by.

    Returns:
        List of active Industry ORM instances.
    """
    result = await db.execute(
        select(Industry)
        .where(Industry.segment_id == segment_id, Industry.is_active.is_(True))
        .order_by(Industry.name)
    )
    return list(result.scalars().all())


async def create_business(
    db: AsyncSession,
    user_id: UUID,
    industry_id: UUID,
    segment_id: UUID,
    business_name: str,
    business_description: str | None = None,
    city: str | None = None,
    state: str | None = None,
    address: str | None = None,
    pincode: str | None = None,
    year_established: int | None = None,
    employee_count: int | None = None,
    annual_turnover_range: str | None = None,
) -> BusinessProfile:
    """Create a new business profile.

    Args:
        user_id: UUID of the owning user.
        industry_id: UUID of the industry.
        segment_id: UUID of the segment.
        business_name: Name of the business.
        business_description: Optional description.
        city: Optional city.
        state: Optional state.
        address: Optional address.
        pincode: Optional pincode.
        year_established: Optional year established.
        employee_count: Optional employee count.
        annual_turnover_range: Optional turnover range.

    Returns:
        The newly created BusinessProfile ORM instance.
    """
    business = await Base.create(
        db,
        BusinessProfile,
        user_id=user_id,
        industry_id=industry_id,
        segment_id=segment_id,
        business_name=business_name,
        business_description=business_description,
        city=city,
        state=state,
        address=address,
        pincode=pincode,
        year_established=year_established,
        employee_count=employee_count,
        annual_turnover_range=annual_turnover_range,
    )

    # Eagerly load relationships for serialization
    return await Base.get_by_id(
        db,
        BusinessProfile,
        business.id,
        options=[
            selectinload(BusinessProfile.industry),
            selectinload(BusinessProfile.segment),
        ],
        active_only=True,
    )


async def get_business_by_user_id(
    db: AsyncSession, user_id: UUID
) -> BusinessProfile | None:
    """Fetch a user's active business profile.

    Args:
        user_id: UUID of the user.

    Returns:
        BusinessProfile if found, None otherwise.
    """
    result = await db.execute(
        select(BusinessProfile)
        .options(
            selectinload(BusinessProfile.industry),
            selectinload(BusinessProfile.segment),
        )
        .where(BusinessProfile.user_id == user_id, BusinessProfile.is_active.is_(True))
    )
    return result.scalar_one_or_none()


async def get_businesses_by_user_id(
    db: AsyncSession, user_id: UUID
) -> list[BusinessProfile]:
    """Fetch all active business profiles for a user.

    Args:
        user_id: UUID of the user.

    Returns:
        List of active BusinessProfile instances.
    """
    result = await db.execute(
        select(BusinessProfile)
        .options(
            selectinload(BusinessProfile.industry),
            selectinload(BusinessProfile.segment),
        )
        .where(BusinessProfile.user_id == user_id, BusinessProfile.is_active.is_(True))
        .order_by(BusinessProfile.created_at)
    )
    return list(result.scalars().all())


async def get_business_by_id(
    db: AsyncSession, business_id: UUID
) -> BusinessProfile | None:
    """Fetch an active business profile by its ID.

    Args:
        business_id: UUID of the business profile.

    Returns:
        BusinessProfile if found, None otherwise.
    """
    return await Base.get_by_id(
        db,
        BusinessProfile,
        business_id,
        options=[
            selectinload(BusinessProfile.industry),
            selectinload(BusinessProfile.segment),
        ],
        active_only=True,
    )


async def delete_business(
    db: AsyncSession, business_id: UUID
) -> BusinessProfile | None:
    """Soft-delete a business profile by setting is_active to False.

    Args:
        business_id: UUID of the business profile to delete.

    Returns:
        The updated BusinessProfile instance if found, None otherwise.
    """
    return await Base.soft_delete(db, BusinessProfile, business_id)
