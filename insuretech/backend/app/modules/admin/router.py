"""Route definitions for admin workflows."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.models import User
from app.modules.admin.constants import (
    ADMIN_PREFIX,
    ADMIN_ROLE,
    ADMIN_TAG,
    DOCUMENT_DETAIL_ROUTE,
    DOCUMENTS_ROUTE,
    STATS_ROUTE,
    UPLOAD_FILE_ROUTE,
    UPLOAD_ROUTE,
    USERS_ROUTE,
    USER_STATUS_ROUTE,
)
from app.modules.admin.schemas import UpdateUserStatusRequest, UploadRequest
from app.modules.admin.service import Service
from app.shared.dependency.role_required import role_required
from app.shared.response import APIResponse

router = APIRouter(
    prefix=ADMIN_PREFIX,
    tags=[ADMIN_TAG],
)


@router.get(STATS_ROUTE)
async def admin_dashboard_stats(
    current_user: Annotated[User, Depends(role_required(ADMIN_ROLE))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Fetch dashboard statistics."""
    _ = current_user
    return await Service.get_dashboard_stats_service(db)


@router.get(USERS_ROUTE)
async def admin_get_users(
    current_user: Annotated[User, Depends(role_required(ADMIN_ROLE))],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
    is_active: bool | None = None,
) -> APIResponse:
    """Fetch users for admin management."""
    _ = current_user
    return await Service.get_all_users_service(db, page, limit, is_active)


@router.get(DOCUMENTS_ROUTE)
async def admin_list_documents(
    current_user: Annotated[User, Depends(role_required(ADMIN_ROLE))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """List knowledge-base documents."""
    _ = current_user
    return await Service.list_knowledge_documents_service(db)


@router.delete(DOCUMENT_DETAIL_ROUTE)
async def admin_delete_document(
    document_id: str,
    current_user: Annotated[User, Depends(role_required(ADMIN_ROLE))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Delete a knowledge-base document."""
    _ = current_user
    return await Service.delete_knowledge_document_service(db, document_id)


@router.patch(USER_STATUS_ROUTE)
async def admin_update_user_status(
    user_id: str,
    body: UpdateUserStatusRequest,
    current_user: Annotated[User, Depends(role_required(ADMIN_ROLE))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Update a user's active status."""
    _ = current_user
    return await Service.update_user_status_service(db, user_id, body.is_active)


@router.post(UPLOAD_ROUTE, status_code=status.HTTP_201_CREATED)
async def admin_upload_pdf(
    data: UploadRequest,
    current_user: Annotated[User, Depends(role_required(ADMIN_ROLE))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Upload an existing PDF path."""
    _ = current_user
    return await Service.upload_pdf_service(data.file_path, db)


@router.post(UPLOAD_FILE_ROUTE, status_code=status.HTTP_201_CREATED)
async def admin_upload_pdf_file(
    file: Annotated[UploadFile, File(...)],
    current_user: Annotated[User, Depends(role_required(ADMIN_ROLE))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Upload and ingest a PDF file."""
    _ = current_user
    return await Service.upload_pdf_file_service(file, db)
