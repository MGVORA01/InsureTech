"""Repository helpers for admin workflows."""

from uuid import UUID

from sqlalchemy import delete as sa_delete, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import asc

from app.models import (
    CustomerSupportChunk,
    Feedback,
    InsuranceCategory,
    Insurer,
    Policy,
    PolicyDocument,
    User,
)
from app.shared import base_repository as Base


async def commit(db: AsyncSession) -> None:
    """Commit the current transaction on the session."""
    await Base.commit(db)

from app.modules.admin.constants import (
    ACTIVE_USERS_KEY,
    CHUNKS_COUNT_LABEL,
    DOCUMENT_TYPE_KNOWLEDGE_BASE,
    INACTIVE_USERS_KEY,
    LIMIT_KEY,
    PAGE_KEY,
    TOTAL_CATEGORIES_KEY,
    TOTAL_INSURERS_KEY,
    TOTAL_KEY,
    TOTAL_POLICIES_KEY,
    TOTAL_USERS_KEY,
    USERS_KEY,
)
from app.shared import base_repository as Base


async def get_user_stats(db: AsyncSession) -> dict[str, int | None]:
    """Fetch aggregate dashboard statistics."""
    total = await db.execute(select(func.count(User.id)))
    active = await db.execute(
        select(func.count(User.id)).where(User.is_active.is_(True))
    )
    inactive = await db.execute(
        select(func.count(User.id)).where(User.is_active.is_(False))
    )
    policies = await db.execute(select(func.count(Policy.id)))
    insurers = await db.execute(select(func.count(Insurer.id)))
    categories = await db.execute(select(func.count(InsuranceCategory.id)))
    return {
        TOTAL_USERS_KEY: total.scalar(),
        ACTIVE_USERS_KEY: active.scalar(),
        INACTIVE_USERS_KEY: inactive.scalar(),
        TOTAL_POLICIES_KEY: policies.scalar(),
        TOTAL_INSURERS_KEY: insurers.scalar(),
        TOTAL_CATEGORIES_KEY: categories.scalar(),
    }


async def get_all_users(
    db: AsyncSession,
    page: int,
    limit: int,
    is_active: bool | None = None,
) -> dict[str, object]:
    """Fetch users with optional active-state filtering."""
    query = (
        select(User).options(selectinload(User.role)).order_by(User.created_at.desc())
    )
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
        USERS_KEY: users,
        TOTAL_KEY: total,
        PAGE_KEY: page,
        LIMIT_KEY: limit,
    }


async def get_feedback_responses(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    sort_order: str = "desc",
) -> dict[str, object]:
    """Fetch admin-visible feedback responses with pagination and optional search."""
    query = select(Feedback).join(Feedback.user).options(selectinload(Feedback.user))
    count_query = select(func.count(Feedback.id)).select_from(Feedback)

    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            or_(User.full_name.ilike(term), User.email.ilike(term))
        )
        count_query = count_query.join(User).where(
            or_(User.full_name.ilike(term), User.email.ilike(term))
        )

    if sort_order.lower() == "asc":
        query = query.order_by(asc(Feedback.created_at))
    else:
        query = query.order_by(desc(Feedback.created_at))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    feedbacks = result.scalars().all()

    return {
        "feedbacks": feedbacks,
        "total": total,
        "page": page,
        "limit": limit,
    }


async def update_user_status(
    db: AsyncSession,
    user_id: UUID,
    is_active: bool,
) -> User | None:
    """Update and persist a user's active state."""
    user = await Base.get_by_id(db, User, user_id, options=[selectinload(User.role)])
    if not user:
        return None
    user.is_active = is_active
    await db.flush()
    await db.refresh(user)
    return user


async def get_knowledge_documents(db: AsyncSession) -> list[object]:
    """Fetch uploaded knowledge-base documents with chunk counts."""
    result = await db.execute(
        select(
            PolicyDocument.id,
            PolicyDocument.file_name,
            PolicyDocument.file_size,
            PolicyDocument.created_at,
            func.count(CustomerSupportChunk.id).label(CHUNKS_COUNT_LABEL),
        )
        .outerjoin(
            CustomerSupportChunk,
            CustomerSupportChunk.document_id == PolicyDocument.id,
        )
        .where(PolicyDocument.doc_type == DOCUMENT_TYPE_KNOWLEDGE_BASE)
        .group_by(PolicyDocument.id)
        .order_by(PolicyDocument.created_at.desc())
    )
    return result.all()


async def delete_knowledge_document(
    db: AsyncSession,
    document_id: UUID,
) -> PolicyDocument | None:
    """Delete a knowledge document and its support chunks."""
    stmt = sa_delete(CustomerSupportChunk).where(
        CustomerSupportChunk.document_id == document_id
    )
    await db.execute(stmt)

    result = await db.execute(
        select(PolicyDocument).where(PolicyDocument.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if doc:
        await db.delete(doc)

    await db.flush()
    return doc
