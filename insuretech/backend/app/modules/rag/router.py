from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import BadRequestException
from app.shared.dependency.get_current_user import get_current_user
from app.shared.response import APIResponse
from app.models import User
from app.modules.rag.schemas import RagQueryRequest, RagQueryResponse
from app.modules.rag.service import Service

router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post("/ask", status_code=200)
async def ask_rag(
    body: RagQueryRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse[RagQueryResponse]:
    if not body.query.strip():
        raise BadRequestException("Query cannot be empty")

    result = await Service.query(
        db=db,
        user_id=str(current_user.id),
        request=body,
    )

    return APIResponse.success_response(
        message="RAG query completed",
        data=result,
    )
