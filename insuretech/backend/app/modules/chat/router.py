from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.modules.chat import service
from app.modules.chat.schemas import ChatRequest

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


@router.post("", status_code=status.HTTP_200_OK)
async def chat(
    data: ChatRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await service.chat(data, db)
