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


class UnauthorizedException(Exception):
    """Raised when authentication fails."""


class NotFoundException(Exception):
    """Raised when requested resource does not exist."""


class ConflictException(Exception):
    """Raised when resource conflict occurs."""


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
        content=APIResponse.error_response(
            message=str(exc.detail)
        ).model_dump(),
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Handle Pydantic validation errors."""

    validation_errors = [
        {
            "field": ".".join(
                str(location)
                for location in error["loc"]
                if location != "body"
            ),
            "message": error["msg"],
        }
        for error in exc.errors()
    ]

    logger.warning(
        "Validation error occurred: %s",
        validation_errors,
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=APIResponse.error_response(
            message="Validation error",
            data=validation_errors,
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
        content=APIResponse.error_response(
            message=str(exc)
        ).model_dump(),
    )


async def unauthorized_exception_handler(
    request: Request,
    exc: UnauthorizedException,
) -> JSONResponse:
    """Handle custom unauthorized exceptions."""

    logger.warning(str(exc))

    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content=APIResponse.error_response(
            message=str(exc)
        ).model_dump(),
    )


async def not_found_exception_handler(
    request: Request,
    exc: NotFoundException,
) -> JSONResponse:
    """Handle custom not found exceptions."""

    logger.info(str(exc))

    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content=APIResponse.error_response(
            message=str(exc)
        ).model_dump(),
    )


async def conflict_exception_handler(
    request: Request,
    exc: ConflictException,
) -> JSONResponse:
    """Handle custom conflict exceptions."""

    logger.warning(str(exc))

    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content=APIResponse.error_response(
            message=str(exc)
        ).model_dump(),
    )


async def generic_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """Handle unexpected exceptions."""

    logger.exception(
        "Unhandled exception occurred"
    )

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
        Exception,
        generic_exception_handler,
    )