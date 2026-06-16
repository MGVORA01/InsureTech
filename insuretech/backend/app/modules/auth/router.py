from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.models import User
from app.modules.auth.schemas import RegisterRequest, LoginRequest, ChangePasswordRequest, ForgotPasswordRequest, \
  ResetPasswordRequest
from app.modules.auth.service import Service
from app.shared.dependency.get_current_user import get_current_user
from fastapi import BackgroundTasks
from fastapi import Response
from fastapi import Request



router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(data: RegisterRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    return await Service.register_user_service(data, db)

@router.post("/login", status_code=status.HTTP_200_OK)
async def login_user(data: LoginRequest, response: Response, db: Annotated[AsyncSession, Depends(get_db)]):
    return await Service.login_user_service(data, db, response)

@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(data: ChangePasswordRequest , current_user: Annotated[User, Depends(get_current_user)],db: Annotated[AsyncSession, Depends(get_db)],):
    return await Service.change_password_service(data, current_user, db)

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(data: ForgotPasswordRequest, db: Annotated[AsyncSession, Depends(get_db)],background_tasks: BackgroundTasks):
    return await Service.forgot_password_service(data, db, background_tasks)

@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(data: ResetPasswordRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    return await Service.reset_password_service(data, db)

@router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh_token(request: Request,response: Response,db: Annotated[AsyncSession, Depends(get_db)]):
    return await Service.refresh_token_service(request,response,db)

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response):
    return await Service.logout_service(response)
