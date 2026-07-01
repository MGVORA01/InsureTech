from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.logging import get_logger
from app.ai.rag_pipeline import retrieve_chunks
from app.ai.llm_providers import generate_response
from app.modules.rag.schemas import RagQueryRequest, RagQueryResponse, ChunkResult

logger = get_logger(__name__)

SYSTEM_PROMPT = """You are an expert insurance policy analyst. Your role is to answer questions 
based strictly on the provided policy document excerpts.

Rules:
1. Answer ONLY using the provided context. If the context doesn't contain enough information, say so.
2. Always mention the specific policy name and insurer when referencing information.
3. If comparing policies across insurers, highlight key differences clearly.
4. Use simple language that a policyholder can understand.
5. Cite the section name for each piece of information you provide."""


class RAGService:

    async def query(
        self,
        db: AsyncSession,
        user_id: str,
        request: RagQueryRequest,
    ) -> RagQueryResponse:
        logger.info(
            "RAG query: user=%s query=%s categories=%s",
            user_id, request.query, request.insurance_categories,
        )

        chunks = await retrieve_chunks(
            db=db,
            query=request.query,
            insurance_categories=request.insurance_categories,
            top_k=request.top_k,
            section_type=request.section_type,
        )

        if not chunks:
            return RagQueryResponse(
                answer="No relevant policy documents found for your query.",
                chunks=[],
                provider="none",
            )

        chunk_results = [
            ChunkResult(
                text=c["text"],
                policy_name=c["metadata"].get("policy_name", ""),
                insurer=c["metadata"].get("insurer", ""),
                insurance_category=c["metadata"].get("insurance_category", ""),
                section_name=c["metadata"].get("section_name", ""),
                section_type=c["metadata"].get("section_type", ""),
                similarity=c["similarity"],
            )
            for c in chunks
        ]

        if settings.GROQ_API_KEY:
            context_parts = []
            for i, c in enumerate(chunks, 1):
                meta = c["metadata"]
                context_parts.append(
                    f"[{i}] Policy: {meta.get('policy_name', 'N/A')} | "
                    f"Insurer: {meta.get('insurer', 'N/A')} | "
                    f"Section: {meta.get('section_name', 'N/A')}\n"
                    f"{c['text']}"
                )
            context = "\n\n".join(context_parts)

            try:
                answer = generate_response(
                    system_prompt=SYSTEM_PROMPT,
                    user_prompt=f"Context:\n{context}\n\nQuestion: {request.query}",
                )
                provider = "groq"
            except Exception as e:
                logger.error("LLM generation failed: %s", e)
                answer = f"Retrieved {len(chunks)} chunks but LLM generation failed: {e}"
                provider = "error"
        else:
            answer = (
                f"Retrieved {len(chunks)} relevant chunks. "
                "Add GROQ_API_KEY to .env to enable AI-generated answers."
            )
            provider = "none"

        return RagQueryResponse(
            answer=answer,
            chunks=chunk_results,
            provider=provider,
        )


Service = RAGService()
