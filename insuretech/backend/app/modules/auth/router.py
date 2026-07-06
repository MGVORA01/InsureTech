"""Route definitions for authentication."""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.core.mail import send_reset_password_email
from app.models import User
from app.modules.auth.cookie_helper import (
    delete_auth_cookies,
    get_refresh_token_from_cookie,
    set_auth_cookies,
)
from app.modules.auth.constants import (
    AUTH_PREFIX,
    AUTH_TAG,
    CHANGE_PASSWORD_ROUTE,
    FORGOT_PASSWORD_ROUTE,
    LOGIN_ROUTE,
    LOGOUT_ROUTE,
    ME_ROUTE,
    REFRESH_ROUTE,
    REGISTER_ROUTE,
    RESET_PASSWORD_ROUTE,
)
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
)
from app.modules.auth.service import Service
from app.shared.dependency.get_current_user import get_current_user
from app.shared.response import APIResponse

router = APIRouter(
    prefix=AUTH_PREFIX,
    tags=[AUTH_TAG],
)


@router.post(REGISTER_ROUTE, status_code=status.HTTP_201_CREATED)
async def register_user(
    data: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Register a user."""
    return await Service.register_user_service(data, db)


@router.post(LOGIN_ROUTE, status_code=status.HTTP_200_OK)
async def login_user(
    data: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Log in a user."""
    service_response, access_token, refresh_token = await Service.login_user_service(
        data,
        db,
    )
    set_auth_cookies(
        response,
        access_token,
        refresh_token,
        remember_me=data.remember_me,
    )
    return service_response


@router.post(CHANGE_PASSWORD_ROUTE, status_code=status.HTTP_200_OK)
async def change_password(
    data: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Change a user's password."""
    return await Service.change_password_service(data, current_user, db)


@router.post(FORGOT_PASSWORD_ROUTE, status_code=status.HTTP_200_OK)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    background_tasks: BackgroundTasks,
) -> APIResponse:
    """Request a password reset email."""
    service_response, email, reset_url = await Service.forgot_password_service(data, db)
    if email and reset_url:
        background_tasks.add_task(send_reset_password_email, email, reset_url)
    return service_response


@router.post(RESET_PASSWORD_ROUTE, status_code=status.HTTP_200_OK)
async def reset_password(
    data: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Reset a password."""
    return await Service.reset_password_service(data, db)


@router.post(REFRESH_ROUTE, status_code=status.HTTP_200_OK)
async def refresh_token(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Refresh auth cookies."""
    refresh_token_value = get_refresh_token_from_cookie(request)
    service_response, access_token = await Service.refresh_token_service(
        refresh_token_value,
        db,
    )
    set_auth_cookies(response, access_token, refresh_token_value)
    return service_response


@router.get(ME_ROUTE, status_code=status.HTTP_200_OK)
async def get_current_user_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> APIResponse:
    """Fetch the current user."""
    return await Service.get_current_user_me_service(current_user)


@router.post(LOGOUT_ROUTE, status_code=status.HTTP_200_OK)
async def logout(response: Response) -> APIResponse:
    """Log out a user."""
    delete_auth_cookies(response)
    return await Service.logout_service()
