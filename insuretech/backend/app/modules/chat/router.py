from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.config import settings
from app.core.database import get_db
from app.modules.chat.constants import CHAT_PREFIX, CHAT_TAG, CHAT_ROUTE
from app.modules.chat.service import Service, get_groq_client
from app.modules.chat.schemas import ChatRequest
from app.shared.response import APIResponse

router = APIRouter(
    prefix=CHAT_PREFIX,
    tags=[CHAT_TAG],
)


@router.post(CHAT_ROUTE, status_code=status.HTTP_200_OK)
async def chat(
    data: ChatRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Process a chat query against the knowledge base."""
    return await Service.chat(data, db)


@router.get("/debug-groq", status_code=status.HTTP_200_OK)
async def debug_groq() -> dict:
    """Debug endpoint — tests Groq connectivity and lists available models."""
    import asyncio

    api_key = (settings.GROQ_API_KEY or "").strip()
    result = {
        "groq_api_key_set": bool(api_key),
        "groq_api_key_prefix": api_key[:10] + "..." if api_key else "NOT SET",
        "groq_model_configured": settings.GROQ_MODEL,
        "available_models": [],
        "models_test": {},
        "error": None,
    }

    if not api_key:
        return result

    from groq import Groq
    try:
        client = Groq(api_key=api_key, timeout=30.0)

        # List all models available for this API key
        try:
            models_resp = await asyncio.to_thread(client.models.list)
            result["available_models"] = sorted([m.id for m in models_resp.data])
        except Exception as e:
            result["error"] = f"Could not list models: {e}"

        # Test a few models to find a working one
        test_models = [
            "gemma2-9b-it",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "llama3-8b-8192",
            "mixtral-8x7b-32768",
        ]
        for model in test_models:
            try:
                resp = await asyncio.to_thread(
                    client.chat.completions.create,
                    model=model,
                    messages=[{"role": "user", "content": "Say hi."}],
                    max_tokens=5,
                    temperature=0.1,
                )
                result["models_test"][model] = f"✅ WORKS: {resp.choices[0].message.content}"
            except Exception as exc:
                result["models_test"][model] = f"❌ {str(exc)[:80]}"

    except Exception as exc:
        result["error"] = str(exc)

    return result


