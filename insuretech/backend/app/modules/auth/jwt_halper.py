from datetime import datetime, timedelta, timezone
from jose import jwt
from app.core.config import settings


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


#decode token

#verify tokrn

#get refresh token expiry
