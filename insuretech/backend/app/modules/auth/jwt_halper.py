from datetime import datetime, timedelta, timezone
from jose import jwt
from app.core.config import settings


def create_access_token(user):

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    }

    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(user):

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    }

    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


#decode token

#verify tokrn

#get refresh token expiry
