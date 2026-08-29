from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger
from app.shared.response import APIResponse

logger = get_logger(__name__)


# Custom Exceptions


class BadRequestException(Exception):
    """Raised when request data is invalid."""

    def __init__(self, message: str, data: dict | None = None):
        super().__init__(message)
        self.data = data


class UnauthorizedException(Exception):
    """Raised when authentication fails."""


class NotFoundException(Exception):
    """Raised when requested resource does not exist."""


class ConflictException(Exception):
    """Raised when resource conflict occurs."""


class ForbiddenException(Exception):
    """Raised when the user is authenticated but lacks permission."""


class TooManyRequestsException(Exception):
    """Raised when a request exceeds an allowed rate limit."""


# Global Exception Handlers


async def http_exception_handler(
    request: Request,
    exc: HTTPException,
) -> JSONResponse:
    """Handle FastAPI HTTP exceptions."""

    logger.warning(
        "HTTP exception occurred: %s",
        exc.detail,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=APIResponse.error_response(message=str(exc.detail)).model_dump(),
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Handle Pydantic validation errors."""

    validation_errors = []

    for error in exc.errors():
        field = ".".join(
            str(location) for location in error["loc"] if location != "body"
        )
        message = error["msg"].removeprefix("Value error, ")

        if field == "email":
            message = "Invalid email"

        validation_errors.append(f"{message}" if field else message)

    logger.warning(
        "Validation error occurred: %s",
        validation_errors,
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=APIResponse.error_response(
            message="; ".join(validation_errors),
        ).model_dump(),
    )


async def bad_request_exception_handler(
    request: Request,
    exc: BadRequestException,
) -> JSONResponse:
    """Handle custom bad request exceptions."""

    logger.warning(str(exc))

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=APIResponse.error_response(message=str(exc), data=getattr(exc, 'data', None)).model_dump(),
    )


async def unauthorized_exception_handler(
    request: Request,
    exc: UnauthorizedException,
) -> JSONResponse:
    """Handle custom unauthorized exceptions."""

    logger.warning(str(exc))

    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content=APIResponse.error_response(message=str(exc)).model_dump(),
    )


async def not_found_exception_handler(
    request: Request,
    exc: NotFoundException,
) -> JSONResponse:
    """Handle custom not found exceptions."""

    logger.info(str(exc))

    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content=APIResponse.error_response(message=str(exc)).model_dump(),
    )


async def conflict_exception_handler(
    request: Request,
    exc: ConflictException,
) -> JSONResponse:
    """Handle custom conflict exceptions."""

    logger.warning(str(exc))

    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content=APIResponse.error_response(message=str(exc)).model_dump(),
    )


async def forbidden_exception_handler(
    request: Request,
    exc: ForbiddenException,
) -> JSONResponse:
    """Handle custom forbidden exceptions."""

    logger.warning(str(exc))

    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content=APIResponse.error_response(message=str(exc)).model_dump(),
    )


async def too_many_requests_exception_handler(
    request: Request,
    exc: TooManyRequestsException,
) -> JSONResponse:
    """Handle custom rate-limit exceptions."""

    logger.warning(str(exc))

    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content=APIResponse.error_response(message=str(exc)).model_dump(),
    )


async def generic_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """Handle unexpected exceptions."""

    logger.exception("Unhandled exception occurred")

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=APIResponse.error_response(
            message="An unexpected error occurred",
        ).model_dump(),
    )


# Registration Function


def register_exception_handlers(app: FastAPI) -> None:
    """Register all application exception handlers."""

    app.add_exception_handler(
        HTTPException,
        http_exception_handler,
    )

    app.add_exception_handler(
        StarletteHTTPException,
        http_exception_handler,
    )

    app.add_exception_handler(
        RequestValidationError,
        validation_exception_handler,
    )

    app.add_exception_handler(
        BadRequestException,
        bad_request_exception_handler,
    )

    app.add_exception_handler(
        UnauthorizedException,
        unauthorized_exception_handler,
    )

    app.add_exception_handler(
        NotFoundException,
        not_found_exception_handler,
    )

    app.add_exception_handler(
        ConflictException,
        conflict_exception_handler,
    )

    app.add_exception_handler(
        TooManyRequestsException,
        too_many_requests_exception_handler,
    )

    app.add_exception_handler(
        ForbiddenException,
        forbidden_exception_handler,
    )

    app.add_exception_handler(
        Exception,
        generic_exception_handler,
    )
