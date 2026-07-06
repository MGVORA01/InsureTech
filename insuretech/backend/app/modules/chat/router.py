from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.modules.chat.constants import CHAT_PREFIX, CHAT_TAG, CHAT_ROUTE
from app.modules.chat.service import Service
from app.modules.chat.schemas import ChatRequest
from app.shared.response import APIResponse

router = APIRouter(
    prefix=CHAT_PREFIX,
    tags=[CHAT_TAG],
)


@router.post(CHAT_ROUTE, status_code=status.HTTP_200_OK)
async def chat(
    data: ChatRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Process a chat query against the knowledge base."""
    return await Service.chat(data, db)
