"""Route definitions for the policies module."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.modules.policies.service import Service
from app.shared.response import APIResponse

router = APIRouter(
    prefix="/policies",
    tags=["policies"],
)


@router.get("", status_code=status.HTTP_200_OK)
async def list_policies(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query()] = 1,
    limit: Annotated[int, Query()] = 10,
    insurance_category_id: Annotated[UUID | None, Query()] = None,
) -> APIResponse:
    """List all active policies with pagination.

    Optionally filter by ``insurance_category_id``.
    """
    return await Service.list_policies(
        db, page=page, limit=limit,
        insurance_category_id=insurance_category_id,
    )


@router.get("/{policy_id}", status_code=status.HTTP_200_OK)
async def get_policy_detail(
    policy_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Fetch a single policy with its documents."""
    return await Service.get_policy_detail(policy_id, db)
