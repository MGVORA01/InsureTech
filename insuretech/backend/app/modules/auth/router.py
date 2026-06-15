from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.modules.auth.schemas import RegisterRequest, LoginRequest, LogoutRequest
from app.modules.auth.service import Service



router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await Service.register_user_service(data, db)

@router.post("/login", status_code=status.HTTP_200_OK)
async def login_user(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await Service.login_user_service(data, db)

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_user(data: LogoutRequest , db: AsyncSession = Depends(get_db)):
    return await Service.logout_user_service(data, db)
