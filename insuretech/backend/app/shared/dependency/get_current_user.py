from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import UnauthorizedException

from app.modules.auth.jwt_helper import decode_token
from app.modules.auth.repository import get_user_by_id
from app.modules.auth.cookie_helper import (
    get_access_token_from_cookie
)


async def get_current_user(
  request: Request,
  db: AsyncSession = Depends(get_db),
):
  access_token = (
    get_access_token_from_cookie(
      request
    )
  )

  if not access_token:
    raise UnauthorizedException(
      "Authentication required"
    )

  payload = decode_token(
    access_token
  )

  if not payload:
    raise UnauthorizedException(
      "Invalid access token"
    )

  if payload.get("type") != "access":
    raise UnauthorizedException(
      "Invalid access token"
    )

  user_id = payload.get("sub")

  user = await get_user_by_id(
    db,
    user_id
  )

  if not user:
    raise UnauthorizedException(
      "User not found"
    )

  if not user.is_active:
    raise UnauthorizedException(
      "Account is inactive"
    )

  return user
