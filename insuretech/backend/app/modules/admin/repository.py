from uuid import UUID

from sqlalchemy.orm import selectinload
from sqlalchemy.sql import func, select

from app.models import User


async def get_user_stats(db) -> dict:
    total = await db.execute(select(func.count(User.id)))
    active = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    inactive = await db.execute(
        select(func.count(User.id)).where(User.is_active == False)
    )
    return {
        "total_users": total.scalar(),
        "active_users": active.scalar(),
        "inactive_users": inactive.scalar(),
    }


async def get_all_users(db, page: int, limit: int, is_active: bool | None = None) -> dict:
    query = select(User).options(selectinload(User.role)).order_by(User.created_at.desc())
    count_query = select(func.count(User.id)).select_from(User)

    if is_active is not None:
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    return {
        "users": users,
        "total": total,
        "page": page,
        "limit": limit,
    }


async def get_user_by_id(db, user_id: UUID):
    result = await db.execute(
        select(User)
        .options(selectinload(User.role))
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def update_user_status(db, user_id: UUID, is_active: bool) -> User | None:
    user = await get_user_by_id(db, user_id)
    if not user:
        return None
    user.is_active = is_active
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user
