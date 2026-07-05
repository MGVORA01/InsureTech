"""Route definitions for RAG workflows."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.models import User
from app.modules.rag.constants import ASK_ROUTE, RAG_PREFIX, RAG_TAG
from app.modules.rag.schemas import RagQueryRequest
from app.modules.rag.service import Service
from app.shared.dependency.get_current_user import get_current_user
from app.shared.response import APIResponse

router = APIRouter(prefix=RAG_PREFIX, tags=[RAG_TAG])


@router.post(ASK_ROUTE, status_code=status.HTTP_200_OK)
async def ask_rag(
    body: RagQueryRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Ask a RAG question."""
    return await Service.query(
        db=db,
        user_id=str(current_user.id),
        request=body,
    )
