"""Database access layer for the businesses module."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import BusinessProfile, Industry, Segment
from app.modules.businesses.schemas import CreateBusinessRequest


async def get_all_segments(db: AsyncSession) -> list[Segment]:
    """Fetch all active segments ordered by name.

    Returns:
        List of active Segment ORM instances.
    """
    result = await db.execute(
        select(Segment).where(Segment.is_active == True).order_by(Segment.name)
    )
    return list(result.scalars().all())


async def get_industries_by_segment(db: AsyncSession, segment_id: UUID) -> list[Industry]:
    """Fetch active industries for a given segment.

    Args:
        segment_id: UUID of the segment to filter by.

    Returns:
        List of active Industry ORM instances.
    """
    result = await db.execute(
        select(Industry)
        .where(Industry.segment_id == segment_id, Industry.is_active == True)
        .order_by(Industry.name)
    )
    return list(result.scalars().all())


async def create_business(
    db: AsyncSession,
    user_id: UUID,
    data: CreateBusinessRequest,
) -> BusinessProfile:
    """Create a new business profile.

    Args:
        user_id: UUID of the owning user.
        data: Validated create-business payload.

    Returns:
        The newly created BusinessProfile ORM instance.
    """
    business = BusinessProfile(
        user_id=user_id,
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
    db.add(business)
    await db.commit()
    await db.refresh(business)
    return business


async def get_business_by_user_id(db: AsyncSession, user_id: UUID) -> BusinessProfile | None:
    """Fetch a user's active business profile.

    Args:
        user_id: UUID of the user.

    Returns:
        BusinessProfile if found, None otherwise.
    """
    result = await db.execute(
        select(BusinessProfile)
        .options(selectinload(BusinessProfile.industry), selectinload(BusinessProfile.segment))
        .where(BusinessProfile.user_id == user_id, BusinessProfile.is_active == True)
    )
    return result.scalar_one_or_none()


async def get_business_by_id(db: AsyncSession, business_id: UUID) -> BusinessProfile | None:
    """Fetch an active business profile by its ID.

    Args:
        business_id: UUID of the business profile.

    Returns:
        BusinessProfile if found, None otherwise.
    """
    result = await db.execute(
        select(BusinessProfile)
        .options(selectinload(BusinessProfile.industry), selectinload(BusinessProfile.segment))
        .where(BusinessProfile.id == business_id, BusinessProfile.is_active == True)
    )
    return result.scalar_one_or_none()
