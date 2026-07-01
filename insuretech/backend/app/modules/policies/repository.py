"""Database access layer for the policies module."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Policy, PolicyDocument


async def get_policies_paginated(
    db: AsyncSession,
    page: int = 1,
    limit: int = 10,
    insurance_category_id: UUID | None = None,
) -> tuple[list[Policy], int]:
    """Fetch policies with pagination and optional category filter."""
    query = select(Policy).where(Policy.is_active == True)

    count_query = select(func.count(Policy.id)).where(Policy.is_active == True)

    if insurance_category_id:
        query = query.where(Policy.insurance_category_id == insurance_category_id)
        count_query = count_query.where(Policy.insurance_category_id == insurance_category_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(
        query
        .options(
            selectinload(Policy.insurer),
            selectinload(Policy.insurance_category),
        )
        .order_by(Policy.policy_name)
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all()), total


async def get_policy_by_id(
    db: AsyncSession,
    policy_id: UUID,
) -> Policy | None:
    """Fetch a single policy with all relations."""
    result = await db.execute(
        select(Policy)
        .options(
            selectinload(Policy.insurer),
            selectinload(Policy.insurance_category),
        )
        .where(Policy.id == policy_id, Policy.is_active == True)
    )
    return result.scalar_one_or_none()


async def get_policy_documents(
    db: AsyncSession,
    policy_id: UUID,
) -> list[PolicyDocument]:
    """Fetch documents for a policy."""
    result = await db.execute(
        select(PolicyDocument)
        .where(
            PolicyDocument.policy_id == policy_id,
            PolicyDocument.is_active == True,
        )
        .order_by(PolicyDocument.version.desc())
    )
    return list(result.scalars().all())
