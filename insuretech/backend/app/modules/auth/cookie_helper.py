from fastapi import Request, Response
from app.core.config import settings
from app.modules.auth.constants import (
    ACCESS_TOKEN_COOKIE,
    COOKIE_SAMESITE_LAX,
    REFRESH_TOKEN_COOKIE,
)


def set_auth_cookies(response: Response,access_token: str,refresh_token: str):
    """Set access and refresh tokens as HTTP-only response cookies.

    Args:
        response: FastAPI response object used to set cookies.
        access_token: JWT access token to store in the access cookie.
        refresh_token: JWT refresh token to store in the refresh cookie.
    """

    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        httponly=True,
        secure=False,
        samesite=COOKIE_SAMESITE_LAX,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite=COOKIE_SAMESITE_LAX,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS
                 * 24 * 60 * 60
    )


def delete_auth_cookies(response: Response):
    """Delete authentication cookies from the response.

    Args:
        response: FastAPI response object used to delete cookies.
    """

    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE
    )

    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE
    )


def get_access_token_from_cookie(request: Request):
    """Return the access token stored in the request cookies.

    Args:
        request: FastAPI request containing browser cookies.

    Returns:
        The access token cookie value, or None when it is not present.
    """
    return request.cookies.get(
        ACCESS_TOKEN_COOKIE
    )


def get_refresh_token_from_cookie(request: Request):
    """Return the refresh token stored in the request cookies.

    Args:
        request: FastAPI request containing browser cookies.

    Returns:
        The refresh token cookie value, or None when it is not present.
    """
    return request.cookies.get(
        REFRESH_TOKEN_COOKIE
    )
