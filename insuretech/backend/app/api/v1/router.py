from fastapi import APIRouter

from app.modules.auth.router import router as auth_router


API_router = APIRouter()

API_router.include_router(auth_router)

