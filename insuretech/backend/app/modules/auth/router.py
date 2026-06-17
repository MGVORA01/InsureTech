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
from app.modules.auth.constants import (
    AUTH_ROUTER_PREFIX,
    AUTH_ROUTER_TAG,
    CHANGE_PASSWORD_ROUTE,
    FORGOT_PASSWORD_ROUTE,
    LOGIN_ROUTE,
    LOGOUT_ROUTE,
    REFRESH_ROUTE,
    REGISTER_ROUTE,
    RESET_PASSWORD_ROUTE,
)



router = APIRouter(
    prefix=AUTH_ROUTER_PREFIX,
    tags=[AUTH_ROUTER_TAG],
)

@router.post(REGISTER_ROUTE, status_code=status.HTTP_201_CREATED)
async def register_user(data: RegisterRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    """Register a new user account.

    Args:
        data: Registration request payload.
        db: Async database session dependency.

    Returns:
        API response containing registered user details.
    """
    return await Service.register_user_service(data, db)

@router.post(LOGIN_ROUTE, status_code=status.HTTP_200_OK)
async def login_user(data: LoginRequest, response: Response, db: Annotated[AsyncSession, Depends(get_db)]):
    """Authenticate a user and set auth cookies.

    Args:
        data: Login request payload.
        response: FastAPI response used to set cookies.
        db: Async database session dependency.

    Returns:
        API response for a successful login.
    """
    return await Service.login_user_service(data, db, response)

@router.post(CHANGE_PASSWORD_ROUTE, status_code=status.HTTP_200_OK)
async def change_password(data: ChangePasswordRequest , current_user: Annotated[User, Depends(get_current_user)],db: Annotated[AsyncSession, Depends(get_db)],):
    """Change the current authenticated user's password.

    Args:
        data: Change password request payload.
        current_user: Authenticated user dependency.
        db: Async database session dependency.

    Returns:
        API response for a successful password change.
    """
    return await Service.change_password_service(data, current_user, db)

@router.post(FORGOT_PASSWORD_ROUTE, status_code=status.HTTP_200_OK)
async def forgot_password(data: ForgotPasswordRequest, db: Annotated[AsyncSession, Depends(get_db)],background_tasks: BackgroundTasks):
    """Send a password reset email to a user.

    Args:
        data: Forgot password request payload.
        db: Async database session dependency.
        background_tasks: FastAPI background task manager.

    Returns:
        API response for a queued reset email.
    """
    return await Service.forgot_password_service(data, db, background_tasks)

@router.post(RESET_PASSWORD_ROUTE, status_code=status.HTTP_200_OK)
async def reset_password(data: ResetPasswordRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    """Reset a user's password using a reset token.

    Args:
        data: Reset password request payload.
        db: Async database session dependency.

    Returns:
        API response for a successful password reset.
    """
    return await Service.reset_password_service(data, db)

@router.post(REFRESH_ROUTE, status_code=status.HTTP_200_OK)
async def refresh_token(request: Request,response: Response,db: Annotated[AsyncSession, Depends(get_db)]):
    """Refresh the access token using the refresh token cookie.

    Args:
        request: FastAPI request containing auth cookies.
        response: FastAPI response used to update cookies.
        db: Async database session dependency.

    Returns:
        API response for a successful token refresh.
    """
    return await Service.refresh_token_service(request,response,db)

@router.post(LOGOUT_ROUTE, status_code=status.HTTP_200_OK)
async def logout(response: Response):
    """Log out the current user by clearing auth cookies.

    Args:
        response: FastAPI response used to delete cookies.

    Returns:
        API response for a successful logout.
    """
    return await Service.logout_service(response)
