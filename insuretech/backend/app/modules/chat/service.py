"""Service for chat and knowledge-base PDF ingestion."""

import asyncio
import os
from typing import Any
from uuid import uuid4

from groq import Groq
from langchain_text_splitters import RecursiveCharacterTextSplitter
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
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
    EMBEDDING_MODEL_NAME,
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
from app.modules.chat.system_prompt import SYSTEM_PROMPT
from app.shared.response import APIResponse

client = Groq(api_key=settings.GROQ_API_KEY)
_embed_model = None


def _get_embed_model() -> SentenceTransformer:
    """Return the lazily loaded embedding model."""
    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _embed_model


class ChatService:

    async def chat(
        self,
        data: ChatRequest,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        """Answer a chat question using similar knowledge-base chunks."""
        session_id = data.session_id or str(uuid4())
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
        system_msg = {
            ROLE_KEY: SYSTEM_ROLE,
            CONTENT_KEY: SYSTEM_PROMPT.format(context=context),
        }
        messages = [
            system_msg,
            *data.history,
            {ROLE_KEY: USER_ROLE, CONTENT_KEY: data.question},
        ]
        answer = await self._call_groq(messages)
        sources = [
            SOURCE_TEMPLATE.format(
                page=page, text=text[:SOURCE_TEXT_LIMIT]
            )
            for text, page, _ in chunks
        ]

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

        model = await asyncio.to_thread(_get_embed_model)
        texts = [chunk[CHUNK_TEXT_KEY] for chunk in chunks]
        embeddings = await asyncio.to_thread(model.encode, texts)
        for index, embedding in enumerate(embeddings):
            chunks[index][EMBEDDING_KEY] = embedding.tolist()
            chunks[index][CHUNK_INDEX_KEY] = index

        policy_id, document_id = await Repo.get_or_create_knowledge_document(
            db, os.path.basename(file_path)
        )
        await Repo.delete_existing_chunks(db, document_id)
        await Repo.store_chunks(db, chunks, policy_id, document_id)
        await db.commit()

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
        embedding = await asyncio.to_thread(
            _get_embed_model().encode, text
        )
        return embedding.tolist()

    @staticmethod
    async def _call_groq(messages: list[dict[str, Any]]) -> str:
        """Generate a chat completion using Groq (runs in thread)."""
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=settings.GROQ_MODEL,
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
