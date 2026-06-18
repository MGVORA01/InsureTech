# app/core/middleware.py

from app.core.config import settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def setup_middleware(app: FastAPI) -> None:
    """
    Register application middleware.
    """

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
        settings.FRONTEND_URL
    ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )