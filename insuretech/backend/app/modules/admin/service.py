from uuid import UUID

from app.core.exceptions import NotFoundException
from app.modules.admin import repository as Repository
from app.modules.admin.schemas import UserListItem
from app.shared.response import APIResponse


async def get_dashboard_stats_service(db):
    stats = await Repository.get_user_stats(db)
    return APIResponse.success_response(
        message="Dashboard stats fetched successfully",
        data=stats,
    )


def _user_to_list_item(user) -> dict:
    return UserListItem(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role.name if user.role else "USER",
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if hasattr(user, "created_at") and user.created_at else None,
        updated_at=user.updated_at.isoformat() if hasattr(user, "updated_at") and user.updated_at else None,
    ).model_dump()


async def get_all_users_service(db, page: int, limit: int, is_active: bool | None = None):
    result = await Repository.get_all_users(db, page, limit, is_active)
    users = [_user_to_list_item(u) for u in result["users"]]
    return APIResponse.success_response(
        message="Users fetched successfully",
        data={
            "users": users,
            "total": result["total"],
            "page": result["page"],
            "limit": result["limit"],
        },
    )


async def update_user_status_service(db, user_id: str, is_active: bool):
    user = await Repository.update_user_status(db, UUID(user_id), is_active)
    if not user:
        raise NotFoundException("User not found")
    await db.commit()
    return APIResponse.success_response(
        message="User status updated successfully",
        data=_user_to_list_item(user),
    )
