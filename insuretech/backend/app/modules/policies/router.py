from typing import Annotated
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.exceptions import BadRequestException
from app.shared.dependency.get_current_user import get_current_user
from app.shared.dependency.role_required import role_required
from app.shared.response import APIResponse
from app.models import User
from app.modules.policies.schemas import (
    InsurerCreate, InsurerUpdate,
    InsuranceCategoryCreate, InsuranceCategoryUpdate,
    PolicyCreate, PolicyUpdate,
)
from app.modules.policies.service import Service

router = APIRouter(prefix="/policies", tags=["policies"])

AuthUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(role_required("ADMIN"))]
DBSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/insurers", status_code=200)
async def list_insurers(
    current_user: AuthUser,
    db: DBSession,
) -> APIResponse:
    return await Service.list_insurers(db)


@router.post("/insurers", status_code=201)
async def create_insurer(
    current_user: AdminUser,
    db: DBSession,
    body: InsurerCreate,
) -> APIResponse:
    return await Service.create_insurer(db, body)


@router.put("/insurers/{insurer_id}", status_code=200)
async def update_insurer(
    current_user: AdminUser,
    db: DBSession,
    insurer_id: str,
    body: InsurerUpdate,
) -> APIResponse:
    return await Service.update_insurer(db, insurer_id, body)


@router.delete("/insurers/{insurer_id}", status_code=200)
async def delete_insurer(
    current_user: AdminUser,
    db: DBSession,
    insurer_id: str,
) -> APIResponse:
    return await Service.delete_insurer(db, insurer_id)


@router.get("/categories", status_code=200)
async def list_categories(
    current_user: AuthUser,
    db: DBSession,
) -> APIResponse:
    return await Service.list_categories(db)


@router.post("/categories", status_code=201)
async def create_category(
    current_user: AdminUser,
    db: DBSession,
    body: InsuranceCategoryCreate,
) -> APIResponse:
    return await Service.create_category(db, body)


@router.put("/categories/{category_id}", status_code=200)
async def update_category(
    current_user: AdminUser,
    db: DBSession,
    category_id: str,
    body: InsuranceCategoryUpdate,
) -> APIResponse:
    return await Service.update_category(db, category_id, body)


@router.delete("/categories/{category_id}", status_code=200)
async def delete_category(
    current_user: AdminUser,
    db: DBSession,
    category_id: str,
) -> APIResponse:
    return await Service.delete_category(db, category_id)


@router.get("", status_code=200)
async def list_policies(
    current_user: AuthUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    insurer_id: str | None = Query(None),
    category_id: str | None = Query(None),
    search: str | None = Query(None),
) -> APIResponse:
    return await Service.list_policies(db, page, limit, insurer_id, category_id, search)


@router.get("/{policy_id}", status_code=200)
async def get_policy(
    current_user: AuthUser,
    db: DBSession,
    policy_id: str,
) -> APIResponse:
    return await Service.get_policy(db, policy_id)


@router.post("", status_code=201)
async def create_policy(
    current_user: AdminUser,
    db: DBSession,
    body: PolicyCreate,
) -> APIResponse:
    return await Service.create_policy(db, body)


@router.put("/{policy_id}", status_code=200)
async def update_policy(
    current_user: AdminUser,
    db: DBSession,
    policy_id: str,
    body: PolicyUpdate,
) -> APIResponse:
    return await Service.update_policy(db, policy_id, body)


@router.delete("/{policy_id}", status_code=200)
async def delete_policy(
    current_user: AdminUser,
    db: DBSession,
    policy_id: str,
) -> APIResponse:
    return await Service.delete_policy(db, policy_id)


@router.post("/{policy_id}/upload", status_code=201)
async def upload_policy_pdf(
    current_user: AdminUser,
    db: DBSession,
    policy_id: str,
    file: UploadFile = File(...),
) -> APIResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise BadRequestException("Only PDF files are allowed")
    file_bytes = await file.read()
    if not file_bytes:
        raise BadRequestException("Empty file")
    return await Service.upload_policy_pdf(db, policy_id, file_bytes, file.filename)
