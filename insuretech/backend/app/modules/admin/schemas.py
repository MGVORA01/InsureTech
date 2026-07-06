from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AdminDashboardStats(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    total_policies: int
    total_insurers: int
    total_categories: int


class UserListItem(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: str | None = None
    role: str
    is_active: bool
    created_at: str | None = None
    updated_at: str | None = None


class UserListResponse(BaseModel):
    users: list[UserListItem]
    total: int
    page: int
    limit: int


class UpdateUserStatusRequest(BaseModel):
    is_active: bool


class UploadRequest(BaseModel):
    file_path: str


class KnowledgeDocumentItem(BaseModel):
    id: UUID
    file_name: str
    file_size: int | None = None
    chunks_count: int
    created_at: str


