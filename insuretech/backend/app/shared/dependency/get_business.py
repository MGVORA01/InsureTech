"""FastAPI dependency that resolves the authenticated user's business profile."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import NotFoundException
from app.models import BusinessProfile, User
from app.modules.businesses import repository
from app.shared.dependency.get_current_user import get_current_user


async def get_current_business(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BusinessProfile:
    """Resolve the active business profile for the authenticated user.

    Raises ``NotFoundException`` (404) if no business profile exists.
    The returned instance has ``industry`` and ``segment`` eagerly loaded.
    """
    business = await repository.get_business_by_user_id(db, current_user.id)
    if not business:
        raise NotFoundException("Business profile not found")
    return business
