from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.core.config import settings
from app.modules.auth.constants import (
    JWT_ACCESS_TYPE,
    JWT_EMAIL_KEY,
    JWT_EXPIRATION_KEY,
    JWT_PASSWORD_RESET_TYPE,
    JWT_REFRESH_TYPE,
    JWT_SUBJECT_KEY,
    JWT_TYPE_KEY,
)


def create_access_token(user):
    """Create a signed JWT access token for the given user.

    Args:
        user: User model instance used to build token claims.

    Returns:
        Encoded JWT access token.
    """

    payload = {
        JWT_SUBJECT_KEY: str(user.id),
        JWT_EMAIL_KEY: user.email,
        JWT_TYPE_KEY: JWT_ACCESS_TYPE,
        JWT_EXPIRATION_KEY: datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user):
    """Create a signed JWT refresh token for the given user.

    Args:
        user: User model instance used to build token claims.

    Returns:
        Encoded JWT refresh token.
    """

    payload = {
        JWT_SUBJECT_KEY: str(user.id),
        JWT_EMAIL_KEY: user.email,
        JWT_TYPE_KEY: JWT_REFRESH_TYPE,
        JWT_EXPIRATION_KEY: datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str):
    """Decode and validate a JWT token.

    Args:
        token: Encoded JWT token to decode.

    Returns:
        Decoded token payload when valid, otherwise None.
    """
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError:
        return None


def create_password_reset_token(user):
    """Create a signed JWT password reset token for the given user.

    Args:
        user: User model instance used to build token claims.

    Returns:
        Encoded JWT password reset token.
    """

    payload = {
        JWT_SUBJECT_KEY: str(user.id),
        JWT_EMAIL_KEY: user.email,
        JWT_TYPE_KEY: JWT_PASSWORD_RESET_TYPE,
        JWT_EXPIRATION_KEY: datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
