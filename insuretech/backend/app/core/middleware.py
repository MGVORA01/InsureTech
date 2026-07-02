# app/core/middleware.py

from app.core.config import settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def _allowed_origins() -> list[str]:
    configured = [settings.FRONTEND_URL.rstrip("/")]
    local_dev = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://0.0.0.0:5173",
        "http://0.0.0.0:5174",
    ]
    return list(dict.fromkeys([*configured, *local_dev]))


def setup_middleware(app: FastAPI) -> None:
    """
    Register application middleware.
    """

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):517[0-9]$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
