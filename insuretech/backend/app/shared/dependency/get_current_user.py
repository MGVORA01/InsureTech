from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import UnauthorizedException
from app.modules.auth.jwt_halper import decode_token
from app.modules.auth.repository import get_user_by_id


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise UnauthorizedException("Authentication required")

    payload = decode_token(credentials.credentials)

    if not payload or payload.get("type") != "access":
        raise UnauthorizedException("Invalid access token")

    user_id = payload.get("sub")

    if not user_id:
        raise UnauthorizedException("Invalid access token")

    user = await get_user_by_id(db, user_id)

    if not user or not user.is_active:
        raise UnauthorizedException("User does not exist")

    return user
