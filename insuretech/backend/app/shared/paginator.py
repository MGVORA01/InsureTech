"""Generic pagination helper.

Conforms to the standard paginated list response shape:

.. code-block:: json

    {
      "items": [...],
      "total": <int>,
      "page": <int>,
      "limit": <int>
    }
"""

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


async def paginate(
    db: AsyncSession,
    query: Any,
    page: int = 1,
    limit: int = 10,
) -> dict[str, Any]:
    """Apply offset/limit pagination to a ``select()`` query.

    Args:
        query: A SQLAlchemy ``select()`` statement.
        page: 1-indexed page number (default 1).
        limit: Records per page (default 10).

    Returns:
        A dict with keys ``items``, ``total``, ``page``, ``limit``.
    """
    offset = (page - 1) * limit

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    result = await db.execute(query.offset(offset).limit(limit))
    items = list(result.scalars().all())

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
    }
