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
    """Debug endpoint — tests Groq connectivity. Remove after fixing."""
    import asyncio

    api_key = (settings.GROQ_API_KEY or "").strip()
    result = {
        "groq_api_key_set": bool(api_key),
        "groq_api_key_prefix": api_key[:10] + "..." if api_key else "NOT SET",
        "groq_model": settings.GROQ_MODEL,
        "groq_client_created": False,
        "test_response": None,
        "error": None,
    }

    groq_client = get_groq_client()
    result["groq_client_created"] = groq_client is not None

    if groq_client:
        try:
            response = await asyncio.to_thread(
                groq_client.chat.completions.create,
                model=settings.GROQ_MODEL or "llama-3.1-8b-instant",
                messages=[
                    {"role": "user", "content": "Say hello in one word."}
                ],
                max_tokens=10,
                temperature=0.1,
            )
            result["test_response"] = response.choices[0].message.content
        except Exception as exc:
            result["error"] = str(exc)

    return result

