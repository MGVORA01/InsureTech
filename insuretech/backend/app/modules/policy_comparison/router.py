from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.core.exceptions import BadRequestException
from app.models import User
from app.modules.policy_comparison.schemas import CompareChatRequest, CompareChatResponse, CompareRequest, CompareResponse
from app.modules.policy_comparison.service import Service
from app.shared.dependency.get_current_user import get_current_user
from app.shared.response import APIResponse

router = APIRouter(prefix="/compare", tags=["Policy Comparison"])


@router.post("", status_code=status.HTTP_200_OK)
async def compare_policies(
    body: CompareRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse[CompareResponse]:
    if body.policy_id_a == body.policy_id_b:
        raise BadRequestException("Cannot compare a policy with itself")

    result = await Service.compare(db, user, body)
    return APIResponse.success_response(
        message="Comparison completed successfully",
        data=result.model_dump(),
    )


@router.post("/chat", status_code=status.HTTP_200_OK)
async def compare_chat(
    body: CompareChatRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse[CompareChatResponse]:
    if body.policy_id_a == body.policy_id_b:
        raise BadRequestException("Cannot compare a policy with itself")

    result = await Service.chat(db, user, body)
    return APIResponse.success_response(
        message="Chat response generated",
        data=result.model_dump(),
    )
