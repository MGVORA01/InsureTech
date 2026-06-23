from pydantic import BaseModel
from typing import Optional


class AdminDashboardStats(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int


class UserListItem(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class UserListResponse(BaseModel):
    users: list[UserListItem]
    total: int
    page: int
    limit: int


class UpdateUserStatusRequest(BaseModel):
    is_active: bool
