from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.core.config import settings
from app.modules.auth.constants import EMAIL_VERIFICATION_TOKEN_TYPE


def create_access_token(user):

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user):

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str):
    if not token:
        return None
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError:
        return None


def create_email_verification_token(payload: dict, expires_minutes: int) -> str:
    token_payload = payload.copy()
    token_payload["type"] = EMAIL_VERIFICATION_TOKEN_TYPE
    token_payload["exp"] = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes,
    )
    return jwt.encode(token_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_password_reset_token(user):

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "type": "password_reset",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
