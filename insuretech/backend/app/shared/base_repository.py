"""
Generic CRUD helpers for repository layers.
"""

from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


async def get_by_id(
    db: AsyncSession,
    model: type,
    id: UUID,
    *,
    options: list | None = None,
) -> Any | None:
    """Fetch a record by its UUID primary key.

    Args:
        model: The SQLAlchemy model class.
        id: The UUID primary key value.
        options: Optional list of ``selectinload`` / ``joinedload`` options.

    Returns:
        The ORM instance or None.
    """
    query = select(model).where(model.id == id)
    if options:
        query = query.options(*options)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession,
    model: type,
    **kwargs: Any,
) -> Any:
    """Create and persist a new ORM instance.

    Args:
        model: The SQLAlchemy model class.
        kwargs: Column values passed as keyword arguments.

    Returns:
        The newly created ORM instance (uses ``flush`` + ``refresh``).
    """
    instance = model(**kwargs)
    db.add(instance)
    await db.flush()
    await db.refresh(instance)
    return instance


async def exists(
    db: AsyncSession,
    model: type,
    **filters: Any,
) -> bool:
    """Check whether a record matching all given filters exists.

    Args:
        model: The SQLAlchemy model class.
        filters: Column=value pairs to filter by.

    Returns:
        True if at least one matching record exists.
    """
    query = select(model.id)
    for attr, value in filters.items():
        query = query.where(getattr(model, attr) == value)
    query = query.limit(1)
    result = await db.execute(query)
    return result.scalar_one_or_none() is not None


async def soft_delete(
    db: AsyncSession,
    model: type,
    id: UUID,
) -> Any | None:
    """Set ``is_active`` to False on a record.

    Args:
        model: The SQLAlchemy model class (must have an ``is_active`` column).
        id: The UUID primary key.

    Returns:
        The updated ORM instance or None if not found.
    """
    instance = await get_by_id(db, model, id)
    if not instance:
        return None
    instance.is_active = False
    await db.flush()
    await db.refresh(instance)
    return instance


async def count(
    db: AsyncSession,
    model: type,
    **filters: Any,
) -> int:
    """Count records, optionally filtered.

    Args:
        model: The SQLAlchemy model class.
        filters: Column=value pairs to filter by.

    Returns:
        The total count.
    """
    query = select(func.count(model.id))
    for attr, value in filters.items():
        query = query.where(getattr(model, attr) == value)
    result = await db.execute(query)
    return result.scalar() or 0
