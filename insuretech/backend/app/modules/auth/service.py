"""Business logic for authentication."""

from typing import Any

from fastapi import BackgroundTasks, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ConflictException, UnauthorizedException
from app.core.mail import send_reset_password_email
from app.models import User
from app.modules.auth import repository as Repository
from app.modules.auth.cookie_helper import (
    delete_auth_cookies,
    get_refresh_token_from_cookie,
    set_auth_cookies,
)
from app.modules.auth.jwt_halper import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
)
from app.modules.auth.constants import (
    ACCOUNT_INACTIVE_MESSAGE,
    CURRENT_PASSWORD_INCORRECT_MESSAGE,
    EMAIL_KEY,
    FULL_NAME_KEY,
    INVALID_EMAIL_OR_PASSWORD_MESSAGE,
    INVALID_REFRESH_TOKEN_MESSAGE,
    INVALID_TOKEN_MESSAGE,
    INVALID_TOKEN_TYPE_MESSAGE,
    LOGGED_OUT_MESSAGE,
    PASSWORD_CHANGED_MESSAGE,
    PASSWORD_RESET_EMAIL_SENT_MESSAGE,
    PASSWORD_RESET_TOKEN_TYPE,
    PASSWORDS_DO_NOT_MATCH_MESSAGE,
    PHONE_KEY,
    REFRESH_TOKEN_TYPE,
    RESET_PASSWORD_QUERY_PATH,
    RESET_TOKEN_NOT_FOUND_MESSAGE,
    ROLE_KEY,
    SAME_PASSWORD_MESSAGE,
    TOKEN_REFRESHED_MESSAGE,
    TOKEN_SUBJECT_CLAIM,
    TOKEN_TYPE_CLAIM,
    USER_EMAIL_NOT_FOUND_MESSAGE,
    USER_EXISTS_MESSAGE,
    USER_FETCHED_MESSAGE,
    USER_ID_KEY,
    USER_LOGGED_IN_MESSAGE,
    USER_NOT_FOUND_MESSAGE,
    USER_REGISTERED_MESSAGE,
    USER_ROLE_NAME,
)
from app.modules.auth.password_hashing import hash, verify_hash
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
)
from app.shared.response import APIResponse


class AuthService:
    """Service for authentication workflows."""

    async def register_user_service(
        self,
        data: RegisterRequest,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        """Register a new user."""
        existing_user = await Repository.get_user_by_email(db, data.email)
        if existing_user:
            raise ConflictException(USER_EXISTS_MESSAGE)

        role = await Repository.get_role(db, USER_ROLE_NAME)
        user = await Repository.create_user(
            db,
            email=data.email,
            full_name=data.full_name,
            phone_no=data.phone_no,
            password_hash=hash(data.password),
            role_id=role.id,
        )

        return APIResponse.success_response(
            message=USER_REGISTERED_MESSAGE,
            data={
                FULL_NAME_KEY: user.full_name,
                EMAIL_KEY: user.email,
                PHONE_KEY: user.phone,
            },
        )

    async def login_user_service(
        self,
        data: LoginRequest,
        db: AsyncSession,
        response: Response,
    ) -> APIResponse[dict[str, Any]]:
        """Authenticate a user and set auth cookies."""
        user = await Repository.get_user_by_email(db, data.email)
        if not user:
            raise UnauthorizedException(USER_EMAIL_NOT_FOUND_MESSAGE)
        if not user.is_active:
            raise UnauthorizedException(ACCOUNT_INACTIVE_MESSAGE)
        if not verify_hash(data.password, user.password_hash):
            raise UnauthorizedException(INVALID_EMAIL_OR_PASSWORD_MESSAGE)

        access_token = create_access_token(user)
        refresh_token = create_refresh_token(user)
        set_auth_cookies(
            response,
            access_token,
            refresh_token,
            remember_me=data.remember_me,
        )

        return APIResponse.success_response(
            message=USER_LOGGED_IN_MESSAGE,
            data=self._user_payload(user),
        )

    async def change_password_service(
        self,
        data: ChangePasswordRequest,
        current_user: User,
        db: AsyncSession,
    ) -> APIResponse[None]:
        """Change the current user's password."""
        if not verify_hash(data.current_password, current_user.password_hash):
            raise UnauthorizedException(CURRENT_PASSWORD_INCORRECT_MESSAGE)
        if verify_hash(data.new_password, current_user.password_hash):
            raise ConflictException(SAME_PASSWORD_MESSAGE)

        await Repository.update_user_password(
            db,
            current_user.id,
            hash(data.new_password),
        )
        return APIResponse.success_response(
            message=PASSWORD_CHANGED_MESSAGE,
            data=None,
        )

    async def forgot_password_service(
        self,
        data: ForgotPasswordRequest,
        db: AsyncSession,
        background_tasks: BackgroundTasks,
    ) -> APIResponse[None]:
        """Create a password reset token and email it to the user."""
        user = await Repository.get_user_by_email(db, data.email)
        if not user:
            raise UnauthorizedException(USER_EMAIL_NOT_FOUND_MESSAGE)

        active_token = await Repository.get_active_password_reset_token(db, user.id)
        if active_token:
            await Repository.mark_reset_token_used(db, active_token)

        password_reset_token = create_password_reset_token(user)
        await Repository.store_password_reset_token(
            db,
            user.id,
            hash(password_reset_token),
        )

        reset_url = (
            f"{settings.FRONTEND_URL}{RESET_PASSWORD_QUERY_PATH}{password_reset_token}"
        )
        background_tasks.add_task(send_reset_password_email, user.email, reset_url)

        return APIResponse.success_response(
            message=PASSWORD_RESET_EMAIL_SENT_MESSAGE,
            data=None,
        )

    async def reset_password_service(
        self,
        data: ResetPasswordRequest,
        db: AsyncSession,
    ) -> APIResponse[None]:
        """Reset a user's password with a password reset token."""
        if data.new_password != data.confirm_password:
            raise ConflictException(PASSWORDS_DO_NOT_MATCH_MESSAGE)

        payload = decode_token(data.token)
        if not payload:
            raise UnauthorizedException(INVALID_TOKEN_MESSAGE)
        if payload.get(TOKEN_TYPE_CLAIM) != PASSWORD_RESET_TOKEN_TYPE:
            raise UnauthorizedException(INVALID_TOKEN_TYPE_MESSAGE)

        user = await Repository.get_user_by_id(db, payload.get(TOKEN_SUBJECT_CLAIM))
        if not user:
            raise UnauthorizedException(USER_NOT_FOUND_MESSAGE)

        reset_token = await Repository.get_active_password_reset_token(db, user.id)
        if not reset_token:
            raise UnauthorizedException(RESET_TOKEN_NOT_FOUND_MESSAGE)
        if not verify_hash(data.token, reset_token.token_hash):
            raise UnauthorizedException(INVALID_TOKEN_MESSAGE)

        await Repository.update_user_password(db, user.id, hash(data.new_password))
        await Repository.mark_reset_token_used(db, reset_token)
        return APIResponse.success_response(message=PASSWORD_CHANGED_MESSAGE)

    async def refresh_token_service(
        self,
        request: Request,
        response: Response,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        """Refresh the access token using the refresh cookie."""
        refresh_token = get_refresh_token_from_cookie(request)
        payload = decode_token(refresh_token)
        if not payload:
            raise UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE)
        if payload.get(TOKEN_TYPE_CLAIM) != REFRESH_TOKEN_TYPE:
            raise UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE)

        user = await Repository.get_user_by_id(db, payload.get(TOKEN_SUBJECT_CLAIM))
        if not user:
            raise UnauthorizedException(USER_NOT_FOUND_MESSAGE)
        if not user.is_active:
            raise UnauthorizedException(ACCOUNT_INACTIVE_MESSAGE)

        set_auth_cookies(response, create_access_token(user), refresh_token)
        return APIResponse.success_response(
            message=TOKEN_REFRESHED_MESSAGE,
            data=self._user_payload(user),
        )

    async def get_current_user_me_service(
        self,
        current_user: User,
    ) -> APIResponse[dict[str, Any]]:
        """Return the authenticated user payload."""
        return APIResponse.success_response(
            message=USER_FETCHED_MESSAGE,
            data=self._user_payload(current_user),
        )

    async def logout_service(self, response: Response) -> APIResponse[None]:
        """Clear auth cookies for logout."""
        delete_auth_cookies(response)
        return APIResponse.success_response(
            message=LOGGED_OUT_MESSAGE,
            data=None,
        )

    @staticmethod
    def _user_payload(user: User) -> dict[str, Any]:
        """Build a public user payload."""
        return {
            USER_ID_KEY: str(user.id),
            FULL_NAME_KEY: user.full_name,
            EMAIL_KEY: user.email,
            ROLE_KEY: user.role.name,
        }


Service = AuthService()
