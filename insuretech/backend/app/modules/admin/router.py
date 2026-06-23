from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import User
from app.modules.admin.schemas import UpdateUserStatusRequest
from app.modules.admin.service import (
    get_all_users_service,
    get_dashboard_stats_service,
    update_user_status_service,
)
from app.shared.dependency.role_required import role_required


router = APIRouter(
    prefix="/admin",
    tags=["admin"],
)


@router.get("/stats")
async def admin_dashboard_stats(
    current_user: User = Depends(role_required("ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    return await get_dashboard_stats_service(db)


@router.get("/users")
async def admin_get_users(
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
    is_active: Optional[bool] = None,
    current_user: User = Depends(role_required("ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    return await get_all_users_service(db, page, limit, is_active)


@router.patch("/users/{user_id}/status")
async def admin_update_user_status(
    user_id: str,
    body: UpdateUserStatusRequest,
    current_user: User = Depends(role_required("ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    return await update_user_status_service(db, user_id, body.is_active)
