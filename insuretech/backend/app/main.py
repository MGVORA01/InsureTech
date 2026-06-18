from fastapi import FastAPI
from app.core.logging import setup_logging
from app.core.exceptions import register_exception_handlers
from app.core.middleware import setup_middleware

setup_logging()

from app.api.v1.router import API_router

app = FastAPI()
setup_middleware(app)
register_exception_handlers(app)

app.include_router(API_router, prefix="/api/v1")
