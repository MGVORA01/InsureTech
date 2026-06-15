from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.modules.auth.schemas import RegisterRequest
from app.modules.auth.service import Service



router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await Service.register_user_service(data, db)
