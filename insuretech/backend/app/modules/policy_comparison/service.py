import json
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm_providers import generate_response
from app.ai.rag_pipeline import retrieve_chunks
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.logging import get_logger
from app.models import User
from app.modules.businesses.service import Service as BusinessService
from app.modules.policy_comparison.constants import (
    ADVANTAGE_TERMS,
    BUSINESS_PROFILE_NOT_FOUND_MESSAGE,
    CHAT_RESPONSE_GENERATED_MESSAGE,
    COMPARISON_COMPLETED_MESSAGE,
    COMPARISON_SECTIONS,
    CONFIDENCE_LOW,
    CONFIDENCE_MEDIUM,
    INFO_NOT_AVAILABLE_MESSAGE,
    LIMITATION_TERMS,
    LLM_MODEL,
    LLM_TEMPERATURE,
    POLICY_A_NOT_FOUND_MESSAGE,
    POLICY_B_NOT_FOUND_MESSAGE,
    SAME_POLICY_COMPARISON_MESSAGE,
    SESSION_BUSINESS_MISMATCH_MESSAGE,
    SESSION_POLICY_MISMATCH_MESSAGE,
    STRONGER_INSUFFICIENT_EVIDENCE,
    UNKNOWN_LABEL,
)
from app.modules.policy_comparison.provider import Provider
from app.modules.policy_comparison.prompts import (
    SYSTEM_PROMPT,
    build_chat_messages,
    build_user_prompt,
)
from app.modules.policy_comparison import repository
from app.modules.policy_comparison.repository import get_policy_with_relations
from app.modules.policy_comparison.schemas import (
    CompareChatRequest,
    CompareChatResponse,
    CompareRequest,
    CompareResponse,
    SourceRef,
)
from app.shared.response import APIResponse

logger = get_logger(__name__)


class ComparisonService:
    def __init__(self):
        self._business_service = BusinessService

    def _strip_json_fences(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```"):
            first_newline = text.find("\n")
            if first_newline != -1:
                text = text[first_newline + 1 :]
            if text.endswith("```"):
                text = text[:-3].strip()
        return text

    async def _verify_business_ownership(
        self,
        db: AsyncSession,
        user: User,
        business_profile_id: UUID,
    ):
        profile = await self._business_service.get_business_by_id(business_profile_id, db)
        if profile.user_id != user.id:
            raise NotFoundException(BUSINESS_PROFILE_NOT_FOUND_MESSAGE)

    @staticmethod
    def _policy_id_from_recommendation(rec) -> UUID | None:
        try:
            payload = json.loads(rec.reason_text)
        except (TypeError, ValueError):
            return None
        if not isinstance(payload, dict) or not payload.get("policy_id"):
            return None
        try:
            return UUID(payload["policy_id"])
        except (TypeError, ValueError):
            return None

    async def _verify_session_scope(
        self,
        db: AsyncSession,
        request: CompareRequest | CompareChatRequest,
    ) -> None:
        if not request.session_id:
            return

        business_id = await repository.get_session_business_id(db, request.session_id)
        if business_id != request.business_profile_id:
            raise BadRequestException(SESSION_BUSINESS_MISMATCH_MESSAGE)

        recs = await repository.get_active_recommendations_for_session(
            db,
            request.session_id,
        )
        recommended_policy_ids = {
            policy_id
            for rec in recs
            if (policy_id := self._policy_id_from_recommendation(rec)) is not None
        }
        if recs and not recommended_policy_ids:
            logger.warning(
                "Could not recover policy ids from recommendation payloads for session %s",
                request.session_id,
            )
            return
        selected = {request.policy_id_a, request.policy_id_b}
        if not selected.issubset(recommended_policy_ids):
            raise BadRequestException(SESSION_POLICY_MISMATCH_MESSAGE)

    @staticmethod
    def _shorten_text(text: str, limit: int = 900) -> str:
        cleaned = " ".join((text or "").split())
        if len(cleaned) <= limit:
            return cleaned
        return cleaned[:limit].rsplit(" ", 1)[0] + "..."

    def _extract_points_from_text(
        self,
        text: str,
        terms: tuple[str, ...] | None = None,
        limit: int = 3,
        max_length: int = 180,
    ) -> list[str]:
        cleaned = " ".join((text or "").split())
        if not cleaned:
            return []

        candidates = []
        for part in cleaned.replace(";", ". ").split(". "):
            sentence = part.strip(" .:-•\t")
            if len(sentence) < 24 or sentence.count("|") >= 3:
                continue
            lower = sentence.lower()
            if terms and not any(term in lower for term in terms):
                continue
            candidates.append(self._shorten_text(sentence, max_length))
            if len(candidates) >= limit:
                break
        if not candidates and not terms:
            candidates.append(self._shorten_text(cleaned, max_length))
        return list(dict.fromkeys(candidates))[:limit]

    def _format_pointwise_value(self, chunks: list[dict]) -> str:
        if not chunks:
            return INFO_NOT_AVAILABLE_MESSAGE

        points = []
        for chunk in chunks[:2]:
            meta = chunk.get("metadata", {})
            section_name = meta.get("section_name") or "Retrieved section"
            extracted = self._extract_points_from_text(chunk.get("text", ""), limit=2)
            for item in extracted:
                points.append(f"{section_name}: {item}")
                if len(points) >= 3:
                    return "\n".join(points)
        return "\n".join(points) if points else INFO_NOT_AVAILABLE_MESSAGE

    def _format_retrieved_value(self, chunks: list[dict]) -> str:
        if not chunks:
            return INFO_NOT_AVAILABLE_MESSAGE

        return self._format_pointwise_value(chunks)

    def _format_evidence(
        self,
        section_name: str,
        policy_a_chunks: list[dict],
        policy_b_chunks: list[dict],
    ) -> str:
        evidence_parts = []
        if policy_a_chunks:
            meta = policy_a_chunks[0].get("metadata", {})
            evidence_parts.append(
                f"Policy A evidence ({meta.get('section_name') or section_name}): "
                f"{self._shorten_text(policy_a_chunks[0].get('text', ''), 350)}"
            )
        if policy_b_chunks:
            meta = policy_b_chunks[0].get("metadata", {})
            evidence_parts.append(
                f"Policy B evidence ({meta.get('section_name') or section_name}): "
                f"{self._shorten_text(policy_b_chunks[0].get('text', ''), 350)}"
            )
        return "\n\n".join(evidence_parts) or INFO_NOT_AVAILABLE_MESSAGE

    def _chunks_to_compare_response(
        self,
        policy_a_name: str,
        policy_b_name: str,
        section_chunks: dict[str, dict[str, list[dict]]],
    ) -> CompareResponse:
        unavailable = INFO_NOT_AVAILABLE_MESSAGE
        comparisons = []
        missing_information = []

        for section_name, chunks_by_policy in section_chunks.items():
            policy_a_chunks = chunks_by_policy.get("A", [])
            policy_b_chunks = chunks_by_policy.get("B", [])
            has_a = bool(policy_a_chunks)
            has_b = bool(policy_b_chunks)
            if not has_a:
                missing_information.append(f"{section_name}: Policy A")
            if not has_b:
                missing_information.append(f"{section_name}: Policy B")

            comparisons.append(
                {
                    "category": section_name,
                    "policy_a_value": self._format_retrieved_value(policy_a_chunks),
                    "policy_b_value": self._format_retrieved_value(policy_b_chunks),
                    "stronger": STRONGER_INSUFFICIENT_EVIDENCE,
                    "evidence": self._format_evidence(
                        section_name,
                        policy_a_chunks,
                        policy_b_chunks,
                    ),
                    "confidence": CONFIDENCE_MEDIUM
                    if has_a and has_b
                    else CONFIDENCE_LOW,
                }
            )

        available_sections = [
            section
            for section, chunks_by_policy in section_chunks.items()
            if chunks_by_policy.get("A") or chunks_by_policy.get("B")
        ]
        if available_sections:
            executive_summary = (
                f"Retrieved policy wording was found for {policy_a_name} and "
                f"{policy_b_name} across: {', '.join(available_sections[:6])}. "
                "The comparison below shows only text retrieved from the selected "
                "policy documents."
            )
        else:
            executive_summary = (
                f"No relevant document chunks were found for {policy_a_name} and "
                f"{policy_b_name}."
            )

        coverage_chunks_a = section_chunks.get("Coverage", {}).get("A", [])
        coverage_chunks_b = section_chunks.get("Coverage", {}).get("B", [])
        gap_chunks_a = section_chunks.get("Coverage Gap Analysis", {}).get("A", [])
        gap_chunks_b = section_chunks.get("Coverage Gap Analysis", {}).get("B", [])
        risk_chunks_a = section_chunks.get("Business Risk Alignment", {}).get("A", [])
        risk_chunks_b = section_chunks.get("Business Risk Alignment", {}).get("B", [])

        all_chunks_a = [
            chunk
            for chunks_by_policy in section_chunks.values()
            for chunk in chunks_by_policy.get("A", [])
        ]
        all_chunks_b = [
            chunk
            for chunks_by_policy in section_chunks.values()
            for chunk in chunks_by_policy.get("B", [])
        ]

        return CompareResponse(
            executive_summary=executive_summary,
            comparisons=comparisons,
            coverage_gap_analysis=(
                self._format_evidence(
                    "Coverage Gap Analysis", gap_chunks_a, gap_chunks_b
                )
                if gap_chunks_a or gap_chunks_b
                else self._format_evidence(
                    "Coverage", coverage_chunks_a, coverage_chunks_b
                )
            ),
            business_risk_alignment=(
                self._format_evidence(
                    "Business Risk Alignment", risk_chunks_a, risk_chunks_b
                )
                if risk_chunks_a or risk_chunks_b
                else unavailable
            ),
            advantages_a=self._extract_policy_points(all_chunks_a, ADVANTAGE_TERMS),
            advantages_b=self._extract_policy_points(all_chunks_b, ADVANTAGE_TERMS),
            limitations_a=self._extract_policy_points(all_chunks_a, LIMITATION_TERMS),
            limitations_b=self._extract_policy_points(all_chunks_b, LIMITATION_TERMS),
            overall_recommendation=(
                "Review the retrieved evidence section by section. No overall winner "
                "is selected unless the selected policy documents provide explicit "
                "supporting wording."
            ),
            missing_information=missing_information,
            overall_confidence=CONFIDENCE_MEDIUM
            if available_sections
            else CONFIDENCE_LOW,
        )

    def _compact_chunks_for_prompt(self, chunks: list[dict], limit: int = 550) -> str:
        if not chunks:
            return INFO_NOT_AVAILABLE_MESSAGE

        entries = []
        for chunk in chunks[:1]:
            meta = chunk.get("metadata", {})
            section_name = meta.get("section_name") or "Retrieved section"
            entries.append(
                f"{section_name}: {self._shorten_text(chunk.get('text', ''), limit)}"
            )
        return "\n".join(entries)

    def _extract_policy_points(
        self,
        chunks: list[dict],
        terms: tuple[str, ...],
        limit: int = 4,
    ) -> list[str]:
        points = []
        for chunk in chunks:
            points.extend(
                self._extract_points_from_text(
                    chunk.get("text", ""),
                    terms=terms,
                    limit=2,
                    max_length=150,
                )
            )
            if len(points) >= limit:
                break
        deduped = list(dict.fromkeys(points))[:limit]
        return deduped or [INFO_NOT_AVAILABLE_MESSAGE]

    def _normalize_compare_response(
        self,
        response: CompareResponse,
        section_chunks: dict[str, dict[str, list[dict]]],
    ) -> CompareResponse:
        all_chunks_a = [
            chunk
            for chunks_by_policy in section_chunks.values()
            for chunk in chunks_by_policy.get("A", [])
        ]
        all_chunks_b = [
            chunk
            for chunks_by_policy in section_chunks.values()
            for chunk in chunks_by_policy.get("B", [])
        ]
        if not response.advantages_a:
            response.advantages_a = self._extract_policy_points(
                all_chunks_a,
                ADVANTAGE_TERMS,
            )
        if not response.advantages_b:
            response.advantages_b = self._extract_policy_points(
                all_chunks_b,
                ADVANTAGE_TERMS,
            )
        if not response.limitations_a:
            response.limitations_a = self._extract_policy_points(
                all_chunks_a,
                LIMITATION_TERMS,
            )
        if not response.limitations_b:
            response.limitations_b = self._extract_policy_points(
                all_chunks_b,
                LIMITATION_TERMS,
            )
        for item in response.comparisons:
            item.policy_a_value = (
                "\n".join(self._extract_points_from_text(item.policy_a_value, limit=3))
                or item.policy_a_value
            )
            item.policy_b_value = (
                "\n".join(self._extract_points_from_text(item.policy_b_value, limit=3))
                or item.policy_b_value
            )
        return response

    def _build_compact_prompt_sections(
        self,
        section_chunks: dict[str, dict[str, list[dict]]],
    ) -> dict[str, str]:
        prompt_sections: dict[str, str] = {}
        for section_name, chunks_by_policy in section_chunks.items():
            policy_a_text = self._compact_chunks_for_prompt(
                chunks_by_policy.get("A", [])
            )
            policy_b_text = self._compact_chunks_for_prompt(
                chunks_by_policy.get("B", [])
            )
            prompt_sections[section_name] = (
                f"[Policy A]\n{policy_a_text}\n\n[Policy B]\n{policy_b_text}"
            )
        return prompt_sections

    async def _retrieve_section_for_policy(
        self,
        db: AsyncSession,
        policy_id: UUID,
        query: str,
        section_type: str | None,
        top_k: int = 2,
    ) -> list[dict]:
        try:
            chunks = await retrieve_chunks(
                db=db,
                query=query,
                policy_ids=[policy_id],
                section_type=section_type,
                top_k=top_k,
            )
            if chunks or section_type is None:
                return chunks

            return await retrieve_chunks(
                db=db,
                query=query,
                policy_ids=[policy_id],
                section_type=None,
                top_k=top_k,
            )
        except Exception as exc:
            logger.warning(
                "Chunk retrieval failed for policy=%s section=%s: %s",
                policy_id,
                section_type,
                exc,
            )
            return []

    async def compare(
        self,
        db: AsyncSession,
        user: User,
        request: CompareRequest,
    ) -> APIResponse[dict]:
        policy_a = await get_policy_with_relations(db, request.policy_id_a)
        if not policy_a:
            raise NotFoundException(POLICY_A_NOT_FOUND_MESSAGE)

        policy_b = await get_policy_with_relations(db, request.policy_id_b)
        if not policy_b:
            raise NotFoundException(POLICY_B_NOT_FOUND_MESSAGE)

        if request.policy_id_a == request.policy_id_b:
            raise BadRequestException(SAME_POLICY_COMPARISON_MESSAGE)

        await self._verify_business_ownership(db, user, request.business_profile_id)
        await self._verify_session_scope(db, request)

        logger.info(
            "Comparing policies: user=%s business=%s policy_a=%s policy_b=%s",
            user.id,
            request.business_profile_id,
            policy_a.policy_name,
            policy_b.policy_name,
        )

        try:
            context = await Provider.get_context(
                db,
                request.business_profile_id,
                session_id=request.session_id,
            )
            context_text = Provider.format_context_for_prompt(context)
        except Exception as exc:
            logger.warning("Business context lookup failed for comparison: %s", exc)
            context_text = "Business context unavailable."

        section_chunks: dict[str, dict[str, list[dict]]] = {}

        for section_name, query, section_type in COMPARISON_SECTIONS:
            policy_a_chunks = await self._retrieve_section_for_policy(
                db=db,
                policy_id=request.policy_id_a,
                query=query,
                section_type=section_type,
            )
            policy_b_chunks = await self._retrieve_section_for_policy(
                db=db,
                policy_id=request.policy_id_b,
                query=query,
                section_type=section_type,
            )
            section_chunks[section_name] = {
                "A": policy_a_chunks,
                "B": policy_b_chunks,
            }

        policy_a_name = f"{policy_a.policy_name}"
        policy_a_insurer = policy_a.insurer.name if policy_a.insurer else UNKNOWN_LABEL
        policy_b_name = f"{policy_b.policy_name}"
        policy_b_insurer = policy_b.insurer.name if policy_b.insurer else UNKNOWN_LABEL

        prompt_sections = self._build_compact_prompt_sections(section_chunks)
        user_prompt = build_user_prompt(
            business_context=context_text,
            policy_a_name=policy_a_name,
            policy_a_insurer=policy_a_insurer,
            policy_b_name=policy_b_name,
            policy_b_insurer=policy_b_insurer,
            section_chunks=prompt_sections,
        )

        try:
            llm_response = await generate_response(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
                model=LLM_MODEL,
                temperature=LLM_TEMPERATURE,
            )
            clean = self._strip_json_fences(llm_response)
            parsed = CompareResponse.model_validate_json(clean)
            result = self._normalize_compare_response(parsed, section_chunks)
            return APIResponse.success_response(
                message=COMPARISON_COMPLETED_MESSAGE,
                data=result.model_dump(),
            )
        except (ValidationError, ValueError) as exc:
            logger.warning("Comparison LLM response could not be parsed: %s", exc)
        except Exception as exc:
            logger.warning(
                "Groq comparison generation failed, using retrieved chunks: %s", exc
            )

        result = self._chunks_to_compare_response(
            policy_a_name=policy_a_name,
            policy_b_name=policy_b_name,
            section_chunks=section_chunks,
        )
        return APIResponse.success_response(
            message=COMPARISON_COMPLETED_MESSAGE,
            data=result.model_dump(),
        )

    async def chat(
        self,
        db: AsyncSession,
        user: User,
        request: CompareChatRequest,
    ) -> APIResponse[dict]:
        policy_a = await get_policy_with_relations(db, request.policy_id_a)
        if not policy_a:
            raise NotFoundException(POLICY_A_NOT_FOUND_MESSAGE)

        policy_b = await get_policy_with_relations(db, request.policy_id_b)
        if not policy_b:
            raise NotFoundException(POLICY_B_NOT_FOUND_MESSAGE)

        if request.policy_id_a == request.policy_id_b:
            raise BadRequestException(SAME_POLICY_COMPARISON_MESSAGE)

        await self._verify_business_ownership(db, user, request.business_profile_id)
        await self._verify_session_scope(db, request)

        logger.info(
            "Comparison chat: user=%s business=%s query=%s policy_a=%s policy_b=%s",
            user.id,
            request.business_profile_id,
            request.query,
            policy_a.policy_name,
            policy_b.policy_name,
        )

        context = await Provider.get_context(
            db,
            request.business_profile_id,
            session_id=request.session_id,
        )
        business_profile_text = Provider.format_context_for_prompt(context)

        try:
            chunks = await retrieve_chunks(
                db=db,
                query=request.query,
                policy_ids=[request.policy_id_a, request.policy_id_b],
                top_k=request.top_k,
            )
        except Exception as exc:
            logger.warning("Comparison chat retrieval failed: %s", exc)
            result = CompareChatResponse(
                answer=INFO_NOT_AVAILABLE_MESSAGE,
                sources=[],
            )
            return APIResponse.success_response(
                message=CHAT_RESPONSE_GENERATED_MESSAGE,
                data=result.model_dump(),
            )

        if not chunks:
            result = CompareChatResponse(
                answer=INFO_NOT_AVAILABLE_MESSAGE,
                sources=[],
            )
            return APIResponse.success_response(
                message=CHAT_RESPONSE_GENERATED_MESSAGE,
                data=result.model_dump(),
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
                f" | Section: {section_name}\n{self._shorten_text(c['text'], 900)}"
            )
            sources.append(
                SourceRef(
                    policy_label=policy_label,
                    text=self._shorten_text(c["text"], 500),
                    section_name=section_name,
                )
            )

        context_text = "\n\n".join(context_parts)

        policy_a_name = f"{policy_a.policy_name}"
        policy_a_insurer = policy_a.insurer.name if policy_a.insurer else UNKNOWN_LABEL
        policy_b_name = f"{policy_b.policy_name}"
        policy_b_insurer = policy_b.insurer.name if policy_b.insurer else UNKNOWN_LABEL

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

        try:
            answer = await generate_response(
                system_prompt="",
                user_prompt="",
                model=LLM_MODEL,
                temperature=LLM_TEMPERATURE,
                messages=messages,
            )
        except Exception as exc:
            logger.warning("Comparison chat generation failed: %s", exc)
            answer = self._format_pointwise_value(chunks)

        result = CompareChatResponse(
            answer=answer,
            sources=sources,
        )
        return APIResponse.success_response(
            message=CHAT_RESPONSE_GENERATED_MESSAGE,
            data=result.model_dump(),
        )


Service = ComparisonService()
