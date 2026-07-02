from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import InsuranceCategory, Policy


async def get_policy_with_relations(
    db: AsyncSession,
    policy_id: UUID,
) -> Policy | None:
    result = await db.execute(
        select(Policy)
        .where(Policy.id == policy_id, Policy.is_active == True)
        .options(
            selectinload(Policy.insurer),
            selectinload(Policy.insurance_category),
        )
    )
    return result.scalar_one_or_none()


async def get_insurance_category_name(
    db: AsyncSession,
    category_id: UUID,
) -> str | None:
    result = await db.execute(
        select(InsuranceCategory.name).where(InsuranceCategory.id == category_id)
    )
    return result.scalar_one_or_none()
