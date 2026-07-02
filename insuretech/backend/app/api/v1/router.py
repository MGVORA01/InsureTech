from fastapi import APIRouter

from app.modules.admin.router import router as admin_router
from app.modules.auth.router import router as auth_router
from app.modules.businesses.router import router as businesses_router
from app.modules.chat.router import router as chat_router
from app.modules.contact.router import router as contact_router
from app.modules.policies.router import router as policies_router
from app.modules.policy_comparison.router import router as comparison_router
from app.modules.profiling.router import router as profiling_router
from app.modules.rag.router import router as rag_router
from app.modules.recommendations.router import router as recommendations_router
from app.modules.reports.router import router as reports_router
from app.modules.policies.router import router as policies_router


API_router = APIRouter()

API_router.include_router(admin_router)
API_router.include_router(auth_router)
API_router.include_router(businesses_router)
API_router.include_router(contact_router)
API_router.include_router(policies_router)
API_router.include_router(comparison_router)
API_router.include_router(profiling_router)
API_router.include_router(rag_router)
API_router.include_router(chat_router)
API_router.include_router(recommendations_router)
API_router.include_router(reports_router)
API_router.include_router(policies_router)
