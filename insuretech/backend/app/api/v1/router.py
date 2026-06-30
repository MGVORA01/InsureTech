from fastapi import APIRouter

from app.modules.admin.router import router as admin_router
from app.modules.auth.router import router as auth_router
from app.modules.businesses.router import router as businesses_router
from app.modules.contact.router import router as contact_router
from app.modules.profiling.router import router as profiling_router


API_router = APIRouter()

API_router.include_router(admin_router)
API_router.include_router(auth_router)
API_router.include_router(businesses_router)
API_router.include_router(contact_router)
API_router.include_router(profiling_router)

