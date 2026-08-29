"""Business logic for authentication."""

from datetime import datetime, timezone
from typing import Any

import secrets
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    TooManyRequestsException,
    UnauthorizedException,
)
from app.models import User
from app.modules.auth import repository as Repository
from app.modules.auth.jwt_helper import (
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
)
from app.modules.auth.constants import (
    ACCOUNT_INACTIVE_MESSAGE,
    CURRENT_PASSWORD_INCORRECT_MESSAGE,
    EMAIL_KEY,
    EMAIL_VERIFICATION_TOKEN_EXPIRED_MESSAGE,
    EMAIL_VERIFICATION_TOKEN_TYPE,
    EMAIL_VERIFIED_MESSAGE,
    FULL_NAME_KEY,
    INVALID_EMAIL_OR_PASSWORD_MESSAGE,
    INVALID_OTP_MESSAGE,
    INVALID_REFRESH_TOKEN_MESSAGE,
    INVALID_TOKEN_MESSAGE,
    INVALID_TOKEN_TYPE_MESSAGE,
    LOGGED_OUT_MESSAGE,
    OTP_EXPIRED_MESSAGE,
    OTP_RESENT_MESSAGE,
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
    TOO_MANY_ATTEMPTS_MESSAGE,
    USER_EXISTS_MESSAGE,
    USER_FETCHED_MESSAGE,
    USER_ID_KEY,
    USER_LOGGED_IN_MESSAGE,
    USER_NOT_FOUND_MESSAGE,
    USER_REGISTERED_MESSAGE,
    USER_ROLE_NAME,
    VERIFICATION_TOKEN_KEY,
)
from app.modules.auth.password_hashing import async_hash, async_verify_hash
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    ResendOtpRequest,
    VerifyEmailRequest,
)
from app.shared.response import APIResponse


class AuthService:
    """Service for authentication workflows."""

    async def register_user_service(
        self,
        data: RegisterRequest,
        db: AsyncSession,
    ) -> tuple[APIResponse[dict[str, Any]], str]:
        """Prepare an email verification token without creating a user row."""
        existing_user = await Repository.get_user_by_email(db, data.email)
        if existing_user:
            raise ConflictException(USER_EXISTS_MESSAGE)

        otp = f"{secrets.randbelow(10000):04d}"
        otp_hash = await async_hash(otp)
        password_hash = await async_hash(data.password)

        token = create_email_verification_token(
            {
                EMAIL_KEY: data.email,
                FULL_NAME_KEY: data.full_name,
                PHONE_KEY: data.phone_no,
                "password_hash": password_hash,
                "otp_hash": otp_hash,
                "attempts": 0,
            },
            settings.EMAIL_OTP_EXPIRE_MINUTES,
        )

        return (
            APIResponse.success_response(
                message=USER_REGISTERED_MESSAGE,
                data={
                    EMAIL_KEY: data.email,
                    VERIFICATION_TOKEN_KEY: token,
                },
            ),
            otp,
        )

    async def login_user_service(
        self,
        data: LoginRequest,
        db: AsyncSession,
    ) -> tuple[APIResponse[dict[str, Any]], str, str]:
        """Authenticate a user and return auth tokens for the router."""
        user = await Repository.get_user_by_email(db, data.email)
        if not user or not user.is_active:
            raise UnauthorizedException(INVALID_EMAIL_OR_PASSWORD_MESSAGE)
        if not await async_verify_hash(data.password, user.password_hash):
            raise UnauthorizedException(INVALID_EMAIL_OR_PASSWORD_MESSAGE)

        access_token = create_access_token(user)
        refresh_token = create_refresh_token(user)

        return (
            APIResponse.success_response(
                message=USER_LOGGED_IN_MESSAGE,
                data=self._user_payload(user),
            ),
            access_token,
            refresh_token,
        )

    async def change_password_service(
        self,
        data: ChangePasswordRequest,
        current_user: User,
        db: AsyncSession,
    ) -> APIResponse[None]:
        """Change the current user's password."""
        if not await async_verify_hash(data.current_password, current_user.password_hash):
            raise UnauthorizedException(CURRENT_PASSWORD_INCORRECT_MESSAGE)
        if await async_verify_hash(data.new_password, current_user.password_hash):
            raise ConflictException(SAME_PASSWORD_MESSAGE)

        await Repository.update_user_password(
            db,
            current_user.id,
            await async_hash(data.new_password),
        )
        await Repository.commit(db)
        return APIResponse.success_response(
            message=PASSWORD_CHANGED_MESSAGE,
            data=None,
        )

    async def forgot_password_service(
        self,
        data: ForgotPasswordRequest,
        db: AsyncSession,
    ) -> tuple[APIResponse[None], str | None, str | None]:
        """Create password reset email details without leaking account existence."""
        user = await Repository.get_user_by_email(db, data.email)
        if not user or not user.is_active:
            return (
                APIResponse.success_response(
                    message=PASSWORD_RESET_EMAIL_SENT_MESSAGE,
                    data=None,
                ),
                None,
                None,
            )

        active_token = await Repository.get_active_password_reset_token(db, user.id)
        if active_token:
            await Repository.mark_reset_token_used(db, active_token)

        password_reset_token = create_password_reset_token(user)
        await Repository.store_password_reset_token(
            db,
            user.id,
            await async_hash(password_reset_token),
        )
        await Repository.commit(db)

        reset_url = (
            f"{settings.FRONTEND_URL}{RESET_PASSWORD_QUERY_PATH}{password_reset_token}"
        )

        return (
            APIResponse.success_response(
                message=PASSWORD_RESET_EMAIL_SENT_MESSAGE,
                data=None,
            ),
            user.email,
            reset_url,
        )

    async def verify_email_service(
        self,
        data: VerifyEmailRequest,
        db: AsyncSession,
    ) -> APIResponse[None]:
        """Verify the OTP from the JWT and create the user once verified."""
        payload = decode_token(data.token)
        if not payload or payload.get(TOKEN_TYPE_CLAIM) != EMAIL_VERIFICATION_TOKEN_TYPE:
            raise BadRequestException(OTP_EXPIRED_MESSAGE)

        attempts = int(payload.get("attempts", 0))
        if attempts >= 5:
            raise TooManyRequestsException(TOO_MANY_ATTEMPTS_MESSAGE)

        otp_hash = payload.get("otp_hash")
        if not otp_hash or not await async_verify_hash(data.otp, otp_hash):
            new_attempts = attempts + 1
            if new_attempts >= 5:
                raise TooManyRequestsException(TOO_MANY_ATTEMPTS_MESSAGE)

            new_token_payload = {
                key: payload[key]
                for key in payload
                if key not in {"exp", TOKEN_TYPE_CLAIM}
            }
            new_token_payload["attempts"] = new_attempts
            expires_at = payload.get("exp")
            if not expires_at:
                raise BadRequestException(OTP_EXPIRED_MESSAGE)
            now_ts = datetime.now(timezone.utc).timestamp()
            expires_seconds = max(int(expires_at) - int(now_ts), 0)
            if expires_seconds <= 0:
                raise BadRequestException(OTP_EXPIRED_MESSAGE)

            new_token = create_email_verification_token(
                new_token_payload,
                expires_seconds // 60 if expires_seconds >= 60 else 1,
            )
            raise BadRequestException(
                INVALID_OTP_MESSAGE,
                data={VERIFICATION_TOKEN_KEY: new_token},
            )

        existing_user = await Repository.get_user_by_email(db, payload[EMAIL_KEY])
        if existing_user:
            raise ConflictException(USER_EXISTS_MESSAGE)

        role = await Repository.get_role(db, USER_ROLE_NAME)
        await Repository.create_user(
            db,
            email=payload[EMAIL_KEY],
            full_name=payload[FULL_NAME_KEY],
            phone_no=payload.get(PHONE_KEY),
            password_hash=payload["password_hash"],
            role_id=role.id,
        )
        await Repository.commit(db)
        return APIResponse.success_response(
            message=EMAIL_VERIFIED_MESSAGE,
            data=None,
        )

    async def resend_otp_service(
        self,
        data: ResendOtpRequest,
        db: AsyncSession,
    ) -> tuple[APIResponse[dict[str, Any]], str, str]:
        """Issue a new verification token with a fresh OTP."""
        payload = decode_token(data.token)
        if not payload or payload.get(TOKEN_TYPE_CLAIM) != EMAIL_VERIFICATION_TOKEN_TYPE:
            raise BadRequestException(EMAIL_VERIFICATION_TOKEN_EXPIRED_MESSAGE)

        email = payload[EMAIL_KEY]
        existing_user = await Repository.get_user_by_email(db, email)
        if existing_user:
            raise ConflictException(USER_EXISTS_MESSAGE)

        otp = f"{secrets.randbelow(10000):04d}"
        otp_hash = await async_hash(otp)
        new_payload = {
            EMAIL_KEY: email,
            FULL_NAME_KEY: payload[FULL_NAME_KEY],
            PHONE_KEY: payload.get(PHONE_KEY),
            "password_hash": payload["password_hash"],
            "otp_hash": otp_hash,
            "attempts": 0,
        }
        new_token = create_email_verification_token(
            new_payload,
            settings.EMAIL_OTP_EXPIRE_MINUTES,
        )

        return (
            APIResponse.success_response(
                message=OTP_RESENT_MESSAGE,
                data={VERIFICATION_TOKEN_KEY: new_token},
            ),
            otp,
            email,
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
        if not await async_verify_hash(data.token, reset_token.token_hash):
            raise UnauthorizedException(INVALID_TOKEN_MESSAGE)

        await Repository.update_user_password(db, user.id, await async_hash(data.new_password))
        await Repository.mark_reset_token_used(db, reset_token)
        await Repository.commit(db)
        return APIResponse.success_response(message=PASSWORD_CHANGED_MESSAGE)

    async def refresh_token_service(
        self,
        refresh_token: str,
        db: AsyncSession,
    ) -> tuple[APIResponse[dict[str, Any]], str]:
        """Refresh an access token from a validated refresh token string."""
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

        access_token = create_access_token(user)
        return (
            APIResponse.success_response(
                message=TOKEN_REFRESHED_MESSAGE,
                data=self._user_payload(user),
            ),
            access_token,
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

    async def logout_service(self) -> APIResponse[None]:
        """Return the logout response payload."""
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
