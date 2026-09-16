"""Service for chat and knowledge-base PDF ingestion."""

import asyncio
import os
from typing import Any
from uuid import uuid4

from groq import Groq
from langchain_text_splitters import RecursiveCharacterTextSplitter
from PyPDF2 import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.modules.chat import repository as Repo
from app.modules.chat.constants import (
    ANSWER_GENERATED_MESSAGE,
    ANSWER_GENERATED_SUCCESS_MESSAGE,
    CHUNK_INDEX_KEY,
    CHUNK_TEXT_KEY,
    CONTENT_KEY,
    CONTEXT_SEPARATOR,
    DEFAULT_CHUNK_LIMIT,
    EMBEDDING_KEY,
    FILE_NOT_FOUND_MESSAGE_TEMPLATE,
    NO_ANSWER_FALLBACK_MESSAGE,
    NO_TEXT_EXTRACTED_MESSAGE,
    PAGE_NUMBER_KEY,
    PDF_PROCESSED_MESSAGE,
    READ_BINARY_MODE,
    ROLE_KEY,
    SOURCE_TEMPLATE,
    SOURCE_TEXT_LIMIT,
    SPLITTER_CHUNK_OVERLAP,
    SPLITTER_CHUNK_SIZE,
    SYSTEM_ROLE,
    USER_ROLE,
)
from app.modules.chat.schemas import ChatRequest, ChatResponse, UploadResponse
from app.core.logging import get_logger
from app.modules.chat.system_prompt import SYSTEM_PROMPT
from app.ai.models.bge_embedding_service import (
    generate_embedding,
    generate_embeddings_batch,
)
from app.shared.response import APIResponse

logger = get_logger(__name__)

_groq_client: Groq | None = None

_GREETING_WORDS: set[str] = {
    "hi", "hello", "hey", "hii", "helo", "heyy", "heya",
    "good morning", "good afternoon", "good evening", "good night",
    "goodmorning", "goodafternoon", "goodevening", "goodnight",
    "how are you", "how r u", "what's up", "whats up", "sup",
    "greetings", "howdy", "hi there", "hello there",
    "thank you", "thanks", "thank u", "ty", "thx",
    "bye", "goodbye", "see you", "see ya", "later",
    "ok", "okay", "great", "nice", "cool",
    "who are you", "what are you", "what can you do",
    "help", "help me",
}


def _is_greeting(text: str) -> bool:
    """Return True if the message is a greeting or small talk."""
    cleaned = text.strip().lower().rstrip("!?.,")
    if cleaned in _GREETING_WORDS:
        return True
    # Single word or very short non-question message
    words = cleaned.split()
    if len(words) <= 3:
        return any(w in _GREETING_WORDS for w in words)
    return False


def get_groq_client() -> Groq | None:
    global _groq_client
    api_key = (settings.GROQ_API_KEY or "").strip()
    if not api_key:
        return None
    if _groq_client is None:
        _groq_client = Groq(api_key=api_key, timeout=30.0)
    return _groq_client


class ChatService:

    async def chat(
        self,
        data: ChatRequest,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        """Answer a chat question using similar knowledge-base chunks."""
        session_id = data.session_id or str(uuid4())

        # --- Greeting / small talk: respond via Groq without needing PDF chunks ---
        if _is_greeting(data.question):
            greeting_context = (
                "The user is sending a greeting or casual message. "
                "Respond warmly and naturally as the InsureTech Assistant. "
                "Invite them to ask anything about insurance policies, coverage, or the platform."
            )
            system_content = SYSTEM_PROMPT.replace("{context}", greeting_context)
            messages = [
                {ROLE_KEY: SYSTEM_ROLE, CONTENT_KEY: system_content},
                {ROLE_KEY: USER_ROLE, CONTENT_KEY: data.question},
            ]
            try:
                answer = await self._call_groq(messages)
            except Exception as exc:
                logger.error("Groq greeting response failed: %s", exc)
                answer = "Hi there! 👋 Welcome to InsureTech. How can I help you today?"
            return APIResponse.success_response(
                message=ANSWER_GENERATED_MESSAGE,
                data=ChatResponse(
                    answer=answer,
                    session_id=session_id,
                    sources=[],
                ).model_dump(),
            )

        query_vec = await self._embed_text(data.question)
        chunks = await Repo.search_similar_chunks(
            db, query_vec, limit=DEFAULT_CHUNK_LIMIT
        )

        if not chunks:
            return APIResponse.success_response(
                message=ANSWER_GENERATED_MESSAGE,
                data=ChatResponse(
                    answer=NO_ANSWER_FALLBACK_MESSAGE,
                    session_id=session_id,
                    sources=[],
                ).model_dump(),
            )

        context = CONTEXT_SEPARATOR.join(chunk[0] for chunk in chunks)
        system_content = SYSTEM_PROMPT.replace("{context}", context)
        system_msg = {
            ROLE_KEY: SYSTEM_ROLE,
            CONTENT_KEY: system_content,
        }

        sanitized_history = []
        for m in (data.history or []):
            if isinstance(m, dict) and m.get(ROLE_KEY) and m.get(CONTENT_KEY):
                sanitized_history.append({
                    ROLE_KEY: str(m[ROLE_KEY]),
                    CONTENT_KEY: str(m[CONTENT_KEY]),
                })

        messages = [
            system_msg,
            *sanitized_history,
            {ROLE_KEY: USER_ROLE, CONTENT_KEY: data.question},
        ]

        sources = [
            SOURCE_TEMPLATE.format(
                page=page if page is not None else 1,
                text=(text or "")[:SOURCE_TEXT_LIMIT],
            )
            for text, page, _ in chunks
        ]

        try:
            answer = await self._call_groq(messages)
        except Exception as exc:
            logger.error("Chat Groq completion failed: %s", exc)
            if not settings.GROQ_API_KEY or not settings.GROQ_API_KEY.strip():
                answer = (
                    "I found relevant policy documentation, but the AI language model (Groq) "
                    "is not configured with a GROQ_API_KEY in the server environment. "
                    "Please set GROQ_API_KEY in your Render dashboard environment variables."
                )
            else:
                top_chunks_summary = "\n\n".join(
                    f"• (Page {page or 1}): {text[:200]}..."
                    for text, page, _ in chunks[:2]
                )
                answer = (
                    "I found relevant information in our policy documents, but the AI service "
                    "is currently busy or rate-limited. Here are the key details:\n\n"
                    f"{top_chunks_summary}\n\n"
                    "Please contact our support team if you need further assistance."
                )

        return APIResponse.success_response(
            message=ANSWER_GENERATED_SUCCESS_MESSAGE,
            data=ChatResponse(
                answer=answer, session_id=session_id, sources=sources
            ).model_dump(),
        )

    async def process_pdf_upload(
        self,
        file_path: str,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        """Extract, embed, and store chunks from a PDF file."""
        if not os.path.exists(file_path):
            raise NotFoundException(
                FILE_NOT_FOUND_MESSAGE_TEMPLATE.format(file_path=file_path)
            )

        def _read_pdf(path: str) -> list[tuple[int, str]]:
            with open(path, READ_BINARY_MODE) as pdf_file:
                reader = PdfReader(pdf_file)
                return [
                    (i + 1, page.extract_text())
                    for i, page in enumerate(reader.pages)
                ]

        pages = await asyncio.to_thread(_read_pdf, file_path)

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=SPLITTER_CHUNK_SIZE,
            chunk_overlap=SPLITTER_CHUNK_OVERLAP,
        )
        chunks = []
        for page_num, text in pages:
            if not text.strip():
                continue
            page_chunks = await asyncio.to_thread(splitter.split_text, text)
            for chunk_text in page_chunks:
                chunks.append(
                    {CHUNK_TEXT_KEY: chunk_text, PAGE_NUMBER_KEY: page_num}
                )

        if not chunks:
            raise BadRequestException(NO_TEXT_EXTRACTED_MESSAGE)

        texts = [chunk[CHUNK_TEXT_KEY] for chunk in chunks]
        embeddings = await asyncio.to_thread(generate_embeddings_batch, texts)
        for index, embedding in enumerate(embeddings):
            chunks[index][EMBEDDING_KEY] = embedding
            chunks[index][CHUNK_INDEX_KEY] = index

        policy_id, document_id = await Repo.get_or_create_knowledge_document(
            db, os.path.basename(file_path)
        )
        await Repo.delete_existing_chunks(db, document_id)
        await Repo.store_chunks(db, chunks, policy_id, document_id)
        await Repo.commit(db)

        return APIResponse.success_response(
            message=PDF_PROCESSED_MESSAGE,
            data=UploadResponse(
                document_id=str(document_id),
                filename=os.path.basename(file_path),
                chunks_count=len(chunks),
            ).model_dump(),
        )

    @staticmethod
    async def _embed_text(text: str) -> list[float]:
        """Embed text into a vector (runs in thread to avoid blocking)."""
        return await asyncio.to_thread(generate_embedding, text)

    @staticmethod
    async def _call_groq(messages: list[dict[str, Any]]) -> str:
        """Generate a chat completion using Groq (runs in thread)."""
        groq_client = get_groq_client()
        if groq_client is None:
            raise ValueError("GROQ_API_KEY is not set or empty in environment.")

        response = await asyncio.to_thread(
            groq_client.chat.completions.create,
            model=settings.GROQ_MODEL or "llama-3.1-8b-instant",
            messages=messages,
            temperature=settings.GROQ_TEMPERATURE,
        )
        return response.choices[0].message.content


Service = ChatService()


async def process_pdf_upload(
    file_path: str,
    db: AsyncSession,
) -> APIResponse[dict[str, Any]]:
    """Module-level wrapper for admin module compatibility."""
    return await Service.process_pdf_upload(file_path, db)
