from fastapi import APIRouter

from app.modules.admin.router import router as admin_router
from app.modules.auth.router import router as auth_router
from app.modules.contact.router import router as contact_router
from app.modules.chat.router import router as chat_router


API_router = APIRouter()

API_router.include_router(admin_router)
API_router.include_router(auth_router)
API_router.include_router(contact_router)
API_router.include_router(chat_router)

