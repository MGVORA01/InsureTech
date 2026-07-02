from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm_providers import generate_response
from app.ai.rag_pipeline import retrieve_chunks
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.logging import get_logger
from app.models import User
from app.modules.businesses.repository import get_business_by_id
from app.modules.policy_comparison.provider import Provider
from app.modules.policy_comparison.prompts import (
    CHAT_SYSTEM_PROMPT,
    SYSTEM_PROMPT,
    build_chat_messages,
    build_user_prompt,
)
from app.modules.policy_comparison.repository import get_policy_with_relations
from app.modules.policy_comparison.schemas import (
    CompareChatRequest,
    CompareChatResponse,
    CompareRequest,
    CompareResponse,
    SourceRef,
)

logger = get_logger(__name__)

COMPARISON_SECTIONS = ["coverage", "exclusions", "claims", "financial", "conditions"]
LLM_MODEL = "llama-3.3-70b-versatile"


class ComparisonService:

    def _strip_json_fences(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```"):
            first_newline = text.find("\n")
            if first_newline != -1:
                text = text[first_newline + 1:]
            if text.endswith("```"):
                text = text[:-3].strip()
        return text

    async def _verify_business_ownership(
        self,
        db: AsyncSession,
        user: User,
        business_profile_id: UUID,
    ):
        profile = await get_business_by_id(db, business_profile_id)
        if not profile:
            raise NotFoundException("Business profile not found")
        if profile.user_id != user.id:
            raise NotFoundException("Business profile not found")

    async def compare(
        self,
        db: AsyncSession,
        user: User,
        request: CompareRequest,
    ) -> CompareResponse:
        policy_a = await get_policy_with_relations(db, request.policy_id_a)
        if not policy_a:
            raise NotFoundException("Policy A not found")

        policy_b = await get_policy_with_relations(db, request.policy_id_b)
        if not policy_b:
            raise NotFoundException("Policy B not found")

        if request.policy_id_a == request.policy_id_b:
            raise BadRequestException("Cannot compare a policy with itself")

        await self._verify_business_ownership(db, user, request.business_profile_id)

        logger.info(
            "Comparing policies: user=%s business=%s policy_a=%s policy_b=%s",
            user.id, request.business_profile_id, policy_a.policy_name, policy_b.policy_name,
        )

        context = await Provider.get_context(db, request.business_profile_id)
        context_text = Provider.format_context_for_prompt(context)

        policy_ids_str = [str(request.policy_id_a), str(request.policy_id_b)]
        section_chunks: dict[str, str] = {}

        for section in COMPARISON_SECTIONS:
            chunks = await retrieve_chunks(
                db=db,
                query=section,
                policy_ids=policy_ids_str,
                section_type=section,
                top_k=3,
            )
            if chunks:
                parts = []
                for c in chunks:
                    meta = c.get("metadata", {})
                    policy_label = "A" if c["policy_id"] == str(request.policy_id_a) else "B"
                    parts.append(
                        f"[Policy {policy_label}] Section: {meta.get('section_name', 'N/A')}\n{c['text']}"
                    )
                section_chunks[section] = "\n\n".join(parts)
            else:
                section_chunks[section] = f"No {section} information found in the retrieved policy sections for either policy."

        policy_a_name = f"{policy_a.policy_name}"
        policy_a_insurer = policy_a.insurer.name if policy_a.insurer else "Unknown"
        policy_b_name = f"{policy_b.policy_name}"
        policy_b_insurer = policy_b.insurer.name if policy_b.insurer else "Unknown"

        user_prompt = build_user_prompt(
            business_context=context_text,
            policy_a_name=policy_a_name,
            policy_a_insurer=policy_a_insurer,
            policy_b_name=policy_b_name,
            policy_b_insurer=policy_b_insurer,
            section_chunks=section_chunks,
        )

        llm_response = generate_response(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            model=LLM_MODEL,
            temperature=0.1,
        )

        clean = self._strip_json_fences(llm_response)
        return CompareResponse.model_validate_json(clean)

    async def chat(
        self,
        db: AsyncSession,
        user: User,
        request: CompareChatRequest,
    ) -> CompareChatResponse:
        policy_a = await get_policy_with_relations(db, request.policy_id_a)
        if not policy_a:
            raise NotFoundException("Policy A not found")

        policy_b = await get_policy_with_relations(db, request.policy_id_b)
        if not policy_b:
            raise NotFoundException("Policy B not found")

        if request.policy_id_a == request.policy_id_b:
            raise BadRequestException("Cannot compare a policy with itself")

        await self._verify_business_ownership(db, user, request.business_profile_id)

        logger.info(
            "Comparison chat: user=%s business=%s query=%s policy_a=%s policy_b=%s",
            user.id, request.business_profile_id, request.query,
            policy_a.policy_name, policy_b.policy_name,
        )

        context = await Provider.get_context(db, request.business_profile_id)
        business_profile_text = Provider.format_context_for_prompt(context)

        policy_ids_str = [str(request.policy_id_a), str(request.policy_id_b)]

        chunks = await retrieve_chunks(
            db=db,
            query=request.query,
            policy_ids=policy_ids_str,
            top_k=request.top_k,
        )

        if not chunks:
            return CompareChatResponse(
                answer="No relevant policy information found for your question.",
                sources=[],
            )

        context_parts = []
        sources = []
        for c in chunks:
            meta = c.get("metadata", {})
            policy_label = "A" if c["policy_id"] == str(request.policy_id_a) else "B"
            section_name = meta.get("section_name", "")
            context_parts.append(
                f"[Policy {policy_label}] {policy_a.policy_name if policy_label == 'A' else policy_b.policy_name} "
                f"| Insurer: {policy_a.insurer.name if policy_label == 'A' else policy_b.insurer.name}"
                f" | Section: {section_name}\n{c['text']}"
            )
            sources.append(SourceRef(
                policy_label=policy_label,
                text=c["text"],
                section_name=section_name,
            ))

        context_text = "\n\n".join(context_parts)

        policy_a_name = f"{policy_a.policy_name}"
        policy_a_insurer = policy_a.insurer.name if policy_a.insurer else "Unknown"
        policy_b_name = f"{policy_b.policy_name}"
        policy_b_insurer = policy_b.insurer.name if policy_b.insurer else "Unknown"

        messages = build_chat_messages(
            policy_a_name=policy_a_name,
            policy_a_insurer=policy_a_insurer,
            policy_b_name=policy_b_name,
            policy_b_insurer=policy_b_insurer,
            context_text=context_text,
            business_profile_text=business_profile_text,
            query=request.query,
            history=request.history,
        )

        answer = generate_response(
            system_prompt="",
            user_prompt="",
            model=LLM_MODEL,
            temperature=0.1,
            messages=messages,
        )

        return CompareChatResponse(
            answer=answer,
            sources=sources,
        )


Service = ComparisonService()
