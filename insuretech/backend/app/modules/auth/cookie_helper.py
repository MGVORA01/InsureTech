from fastapi import Request, Response
from app.core.config import settings

COOKIE_SAMESITE = "none" if settings.COOKIE_SECURE else "lax"


def set_auth_cookies(response: Response, access_token: str, refresh_token: str, remember_me: bool = True):

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60 if remember_me else None
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS
                 * 24 * 60 * 60 if remember_me else None
    )


def delete_auth_cookies(response: Response):

    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )

    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )


def get_access_token_from_cookie(request: Request):
    return request.cookies.get(
        "access_token"
    )


def get_refresh_token_from_cookie(request: Request):
    return request.cookies.get(
        "refresh_token"
    )
