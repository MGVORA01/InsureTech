"""Route definitions for policy workflows."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.models import User
from app.modules.policies.constants import (
    ADMIN_ROLE,
    CATEGORIES_ROUTE,
    CATEGORY_DETAIL_ROUTE,
    EMPTY_VALUE,
    INSURERS_ROUTE,
    INSURER_DETAIL_ROUTE,
    POLICIES_PREFIX,
    POLICIES_ROUTE,
    POLICIES_TAG,
    POLICY_DETAIL_ROUTE,
    POLICY_UPLOAD_ROUTE,
)
from app.modules.policies.schemas import (
    InsuranceCategoryCreate,
    InsuranceCategoryUpdate,
    InsurerCreate,
    InsurerUpdate,
    PolicyCreate,
    PolicyUpdate,
)
from app.modules.policies.service import Service
from app.shared.dependency.get_current_user import get_current_user
from app.shared.dependency.role_required import role_required
from app.shared.response import APIResponse

router = APIRouter(prefix=POLICIES_PREFIX, tags=[POLICIES_TAG])

AuthUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(role_required(ADMIN_ROLE))]
DBSession = Annotated[AsyncSession, Depends(get_db)]


@router.get(INSURERS_ROUTE, status_code=status.HTTP_200_OK)
async def list_insurers(
    current_user: AuthUser,
    db: DBSession,
) -> APIResponse:
    """List insurers."""
    _ = current_user
    return await Service.list_insurers(db)


@router.post(INSURERS_ROUTE, status_code=status.HTTP_201_CREATED)
async def create_insurer(
    current_user: AdminUser,
    db: DBSession,
    body: InsurerCreate,
) -> APIResponse:
    """Create an insurer."""
    _ = current_user
    return await Service.create_insurer(db, body)


@router.put(INSURER_DETAIL_ROUTE, status_code=status.HTTP_200_OK)
async def update_insurer(
    current_user: AdminUser,
    db: DBSession,
    insurer_id: str,
    body: InsurerUpdate,
) -> APIResponse:
    """Update an insurer."""
    _ = current_user
    return await Service.update_insurer(db, insurer_id, body)


@router.delete(INSURER_DETAIL_ROUTE, status_code=status.HTTP_200_OK)
async def delete_insurer(
    current_user: AdminUser,
    db: DBSession,
    insurer_id: str,
) -> APIResponse:
    """Delete an insurer."""
    _ = current_user
    return await Service.delete_insurer(db, insurer_id)


@router.get(CATEGORIES_ROUTE, status_code=status.HTTP_200_OK)
async def list_categories(
    current_user: AuthUser,
    db: DBSession,
) -> APIResponse:
    """List insurance categories."""
    _ = current_user
    return await Service.list_categories(db)


@router.post(CATEGORIES_ROUTE, status_code=status.HTTP_201_CREATED)
async def create_category(
    current_user: AdminUser,
    db: DBSession,
    body: InsuranceCategoryCreate,
) -> APIResponse:
    """Create an insurance category."""
    _ = current_user
    return await Service.create_category(db, body)


@router.put(CATEGORY_DETAIL_ROUTE, status_code=status.HTTP_200_OK)
async def update_category(
    current_user: AdminUser,
    db: DBSession,
    category_id: str,
    body: InsuranceCategoryUpdate,
) -> APIResponse:
    """Update an insurance category."""
    _ = current_user
    return await Service.update_category(db, category_id, body)


@router.delete(CATEGORY_DETAIL_ROUTE, status_code=status.HTTP_200_OK)
async def delete_category(
    current_user: AdminUser,
    db: DBSession,
    category_id: str,
) -> APIResponse:
    """Delete an insurance category."""
    _ = current_user
    return await Service.delete_category(db, category_id)


@router.get(POLICIES_ROUTE, status_code=status.HTTP_200_OK)
async def list_policies(
    current_user: AuthUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    insurer_id: str | None = Query(None),
    category_id: str | None = Query(None),
    search: str | None = Query(None),
) -> APIResponse:
    """List policies."""
    _ = current_user
    return await Service.list_policies(db, page, limit, insurer_id, category_id, search)


@router.get(POLICY_DETAIL_ROUTE, status_code=status.HTTP_200_OK)
async def get_policy(
    current_user: AuthUser,
    db: DBSession,
    policy_id: str,
) -> APIResponse:
    """Fetch a policy."""
    _ = current_user
    return await Service.get_policy(db, policy_id)


@router.post(POLICIES_ROUTE, status_code=status.HTTP_201_CREATED)
async def create_policy(
    current_user: AdminUser,
    db: DBSession,
    body: PolicyCreate,
) -> APIResponse:
    """Create a policy."""
    _ = current_user
    return await Service.create_policy(db, body)


@router.put(POLICY_DETAIL_ROUTE, status_code=status.HTTP_200_OK)
async def update_policy(
    current_user: AdminUser,
    db: DBSession,
    policy_id: str,
    body: PolicyUpdate,
) -> APIResponse:
    """Update a policy."""
    _ = current_user
    return await Service.update_policy(db, policy_id, body)


@router.delete(POLICY_DETAIL_ROUTE, status_code=status.HTTP_200_OK)
async def delete_policy(
    current_user: AdminUser,
    db: DBSession,
    policy_id: str,
) -> APIResponse:
    """Delete a policy."""
    _ = current_user
    return await Service.delete_policy(db, policy_id)


@router.post(POLICY_UPLOAD_ROUTE, status_code=status.HTTP_201_CREATED)
async def upload_policy_pdf(
    current_user: AdminUser,
    db: DBSession,
    policy_id: str,
    file: UploadFile = File(...),
) -> APIResponse:
    """Upload a policy PDF."""
    _ = current_user
    return await Service.upload_policy_pdf(
        db,
        policy_id,
        await file.read(),
        file.filename or EMPTY_VALUE,
    )
