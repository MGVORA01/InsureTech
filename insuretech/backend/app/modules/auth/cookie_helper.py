from fastapi import Request, Response
from app.core.config import settings


def set_auth_cookies(response: Response,access_token: str,refresh_token: str):

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS
                 * 24 * 60 * 60
    )


def delete_auth_cookies(response: Response):

    response.delete_cookie(
        key="access_token"
    )

    response.delete_cookie(
        key="refresh_token"
    )


def get_access_token_from_cookie(request: Request):
    return request.cookies.get(
        "access_token"
    )


def get_refresh_token_from_cookie(request: Request):
    return request.cookies.get(
        "refresh_token"
    )
