# app/core/middleware.py
# CORS origins are read from FRONTEND_URL env var.
# On Render dashboard, set FRONTEND_URL to a comma-separated list of allowed origins.
# Example: https://your-app.vercel.app,https://your-custom-domain.com

from app.core.config import settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def _allowed_origins() -> list[str]:
    # Support comma-separated list of origins in FRONTEND_URL for Render deployment.
    # e.g. FRONTEND_URL=https://your-app.vercel.app,https://your-custom-domain.com
    raw = settings.FRONTEND_URL or ""
    configured = [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]

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
        allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?|https://.*)$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
