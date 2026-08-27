"""Service layer for RAG workflows."""

from typing import Any, cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm_providers import generate_response
from app.ai.rag_pipeline import retrieve_chunks
from app.core.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.logging import get_logger
from app.models import User
from app.modules.rag.constants import (
    CONTEXT_PART_TEMPLATE,
    CONTEXT_SEPARATOR,
    EMPTY_VALUE,
    INSURANCE_CATEGORY_KEY,
    INSURER_KEY,
    LLM_DISABLED_MESSAGE_TEMPLATE,
    LLM_ERROR_LOG_MESSAGE,
    LLM_FAILED_MESSAGE_TEMPLATE,
    METADATA_KEY,
    NO_RELEVANT_DOCUMENTS_MESSAGE,
    NOT_AVAILABLE_VALUE,
    POLICY_NAME_KEY,
    PROVIDER_ERROR,
    PROVIDER_GROQ,
    PROVIDER_NONE,
    QUERY_EMPTY_MESSAGE,
    RAG_COMPLETED_MESSAGE,
    RAG_LOG_MESSAGE,
    SECTION_NAME_KEY,
    SECTION_TYPE_KEY,
    SIMILARITY_KEY,
    SYSTEM_PROMPT,
    TEXT_KEY,
    USER_PROMPT_TEMPLATE,
)
from app.modules.rag.schemas import ChunkResult, RagQueryRequest, RagQueryResponse
from app.shared.response import APIResponse

logger = get_logger(__name__)


class RAGService:
    """Service for RAG queries."""

    async def query(
        self,
        db: AsyncSession,
        user: User,
        request: RagQueryRequest,
    ) -> APIResponse[dict[str, object]]:
        """Answer a RAG query."""
        if not request.query.strip():
            raise BadRequestException(QUERY_EMPTY_MESSAGE)

        if request.policy_ids:
            from app.modules.businesses.service import Service as BusinessService
            from app.models import Recommendation
            import json as _json

            try:
                business = await BusinessService().get_business_by_user(user, db)
            except NotFoundException:
                raise BadRequestException("No business profile found")

            result = await db.execute(
                select(Recommendation).where(
                    Recommendation.business_id == business.id,
                    Recommendation.is_active.is_(True),
                )
            )
            owned_ids: set[str] = set()
            for rec in result.scalars().all():
                try:
                    payload = _json.loads(rec.reason_text)
                    if isinstance(payload, dict) and payload.get("policy_id"):
                        owned_ids.add(str(payload["policy_id"]))
                except (TypeError, ValueError):
                    continue
            requested = {str(pid) for pid in request.policy_ids}
            if not requested.issubset(owned_ids):
                raise BadRequestException(
                    "Access denied to one or more requested policies"
                )

        logger.info(
            RAG_LOG_MESSAGE,
            str(user.id),
            request.query,
            request.insurance_categories,
        )

        chunks = await retrieve_chunks(
            db=db,
            query=request.query,
            insurance_categories=request.insurance_categories,
            top_k=request.top_k,
            section_type=request.section_type,
            policy_ids=request.policy_ids,
        )

        if not chunks:
            result = RagQueryResponse(
                answer=NO_RELEVANT_DOCUMENTS_MESSAGE,
                chunks=[],
                provider=PROVIDER_NONE,
            )
            return APIResponse.success_response(
                message=RAG_COMPLETED_MESSAGE,
                data=result.model_dump(),
            )

        chunk_results = self._build_chunk_results(chunks)

        if settings.GROQ_API_KEY:
            context = self._build_context(chunks)

            try:
                answer = await generate_response(
                    system_prompt=SYSTEM_PROMPT,
                    user_prompt=USER_PROMPT_TEMPLATE.format(
                        context=context,
                        question=request.query,
                    ),
                )
                provider = PROVIDER_GROQ
            except Exception as exc:
                logger.error(LLM_ERROR_LOG_MESSAGE, exc)
                answer = LLM_FAILED_MESSAGE_TEMPLATE.format(
                    chunk_count=len(chunks),
                    error=exc,
                )
                provider = PROVIDER_ERROR
        else:
            answer = LLM_DISABLED_MESSAGE_TEMPLATE.format(
                chunk_count=len(chunks),
            )
            provider = PROVIDER_NONE

        result = RagQueryResponse(
            answer=answer,
            chunks=chunk_results,
            provider=provider,
        )
        return APIResponse.success_response(
            message=RAG_COMPLETED_MESSAGE,
            data=result.model_dump(),
        )

    @staticmethod
    def _build_chunk_results(chunks: list[dict[str, Any]]) -> list[ChunkResult]:
        """Convert retrieved chunks to response schemas."""
        chunk_results = []
        for chunk in chunks:
            metadata = cast(dict[str, Any], chunk[METADATA_KEY])
            chunk_results.append(
                ChunkResult(
                    text=chunk[TEXT_KEY],
                    policy_name=metadata.get(POLICY_NAME_KEY, EMPTY_VALUE),
                    insurer=metadata.get(INSURER_KEY, EMPTY_VALUE),
                    insurance_category=metadata.get(
                        INSURANCE_CATEGORY_KEY,
                        EMPTY_VALUE,
                    ),
                    section_name=metadata.get(SECTION_NAME_KEY, EMPTY_VALUE),
                    section_type=metadata.get(SECTION_TYPE_KEY, EMPTY_VALUE),
                    similarity=chunk[SIMILARITY_KEY],
                )
            )
        return chunk_results

    @staticmethod
    def _build_context(chunks: list[dict[str, Any]]) -> str:
        """Build LLM context from retrieved chunks."""
        context_parts = []
        for index, chunk in enumerate(chunks, 1):
            metadata = cast(dict[str, Any], chunk[METADATA_KEY])
            context_parts.append(
                CONTEXT_PART_TEMPLATE.format(
                    index=index,
                    policy_name=metadata.get(POLICY_NAME_KEY, NOT_AVAILABLE_VALUE),
                    insurer=metadata.get(INSURER_KEY, NOT_AVAILABLE_VALUE),
                    section_name=metadata.get(SECTION_NAME_KEY, NOT_AVAILABLE_VALUE),
                    text=chunk[TEXT_KEY],
                )
            )
        return CONTEXT_SEPARATOR.join(context_parts)


Service = RAGService()
