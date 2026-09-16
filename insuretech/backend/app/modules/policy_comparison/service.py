import json
import re
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers.llm_response_generator import generate_response
from app.ai.retrieval.hybrid_policy_retriever import retrieve_chunks
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.logging import get_logger
from app.models import DocumentChunk, User
from app.modules.businesses.service import Service as BusinessService
from app.modules.policy_comparison.constants import (
    ADVANTAGE_NEGATION_TERMS,
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
    NO_WINNER_MESSAGE,
    NOT_SPECIFICALLY_ADDRESSED_MESSAGE,
    POLICY_A_NOT_FOUND_MESSAGE,
    POLICY_B_NOT_FOUND_MESSAGE,
    SAME_POLICY_COMPARISON_MESSAGE,
    SESSION_BUSINESS_MISMATCH_MESSAGE,
    SESSION_POLICY_MISMATCH_MESSAGE,
    STRONGER_INSUFFICIENT_EVIDENCE,
    REQUIRED_COMPARISON_CATEGORIES,
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
    BusinessRiskItem,
    CompareChatRequest,
    CompareChatResponse,
    ComparisonItem,
    CompareRequest,
    CompareResponse,
    CoverageGapAnalysis,
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

    @staticmethod
    def _clean_single_point(text: str) -> str:
        """Clean and validate an individual point without inventing content."""
        if not text:
            return ""

        cleaned = text.strip()

        # Remove common metadata prefixes
        prefixes = [
            "Policy wording:",
            "Policy wording -",
            "Policy Wording:",
            "Policy Wording -",
            "policy wording:",
            "policy wording -",
            "Retrieved section:",
            "Retrieved chunk:",
            "Policy text:",
        ]
        for p in prefixes:
            if cleaned.lower().startswith(p.lower()):
                cleaned = cleaned[len(p):].strip()
            cleaned = re.sub(re.escape(p), " ", cleaned, flags=re.IGNORECASE)

        # Remove chunk / rank / section / clause labels (e.g. "Chunk 1:", "Rank 2", "Clause 4:")
        cleaned = re.sub(
            r"\b(?:Chunk|Rank|Section|Clause|Point)\s*#?\d+[:.]?\s*",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )

        # Remove page references (e.g. "Page 12 of 50", "Page No. 3", "(Page 4)")
        cleaned = re.sub(
            r"\(?Page\s+(?:No\.?\s*)?\d+\s*(?:of\s*\d+)?\)?\b",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )

        # Remove URN, IRDA, CIN, and GST document codes
        cleaned = re.sub(r"URN:?\s*IRDA[A-Z0-9/]+", "", cleaned)
        cleaned = re.sub(r"IRDA[A-Z0-9/]{10,}", "", cleaned)
        cleaned = re.sub(r"\b(?:CIN|GSTIN|GST):?\s*[A-Z0-9]{8,}\b", "", cleaned, flags=re.IGNORECASE)

        # Strip all leading bullet and numbering prefixes in a loop (e.g. 1), 4), 6), a), (i), 4) i), etc.)
        while True:
            prev = cleaned
            cleaned = re.sub(r"^[\s•\-*▪▸►–—]+", "", cleaned)
            cleaned = re.sub(r"^\s*\(?\d+[.):]\s*", "", cleaned)
            cleaned = re.sub(r"^\s*\(?[a-zA-Z]{1,2}[.)]\s*", "", cleaned)
            cleaned = re.sub(r"^\s*\(?[ivxIVX]+[.)]\s*", "", cleaned)
            cleaned = re.sub(r"^[\s•\-*▪▸►–—]+", "", cleaned).strip()
            if cleaned == prev:
                break

        # Remove internal list markers conjoined in the text (e.g. "namely:- a)", "provided: 1)")
        cleaned = re.sub(r"\bnamely:?-?\s*[a-z]\)", "namely:", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\bprovided:?-?\s*\d+\)", "provided:", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"(?<=\s)\(?\d+[.)]\s+(?=[A-Z])", "", cleaned)
        cleaned = re.sub(r"(?<=\s)\(?[a-z][.)]\s+(?=[A-Z])", "", cleaned)

        # Remove document boilerplate and metadata noise.
        cleaned = re.sub(r"\b(?:www\.|https?://)\S+\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b", "", cleaned)
        cleaned = re.sub(r"\b(?:Tel|Phone|Mob(?:ile)?)\.?:?\s*\+?[\d\s().-]{6,}\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b[A-Z]{1,4}\d{6,}[A-Z0-9/-]*\b", "", cleaned)
        cleaned = re.sub(r"\b(?:logo|copyright|all rights reserved)\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b(?:page|pg)\s*\d+\s*(?:of\s*\d+)?\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(
            r"\b(?:[A-Z][a-z]+\s+){1,5}(?:Insurance|General|Company|Limited|Pvt|Private|Public|LLP|Ltd)\b(?:\s+(?:Insurance|General|Company|Limited|Pvt|Private|Public|LLP|Ltd))*\b",
            "",
            cleaned,
        )

        # Collapse whitespace
        cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()

        # Remove trailing ellipsis artifacts.
        cleaned = re.sub(r"[\s.]*(?:\.\.\.|…)+$", "", cleaned).strip()

        # Clean trailing punctuation oddities like ".," or ".;" or dashes
        cleaned = cleaned.rstrip(",;:- ")

        if not cleaned or len(cleaned) < 10:
            return ""

        if ComparisonService._is_junk_fragment(cleaned):
            return ""
        if ComparisonService._is_incomplete_sentence(cleaned):
            return ""

        # Capitalize the first letter
        cleaned = cleaned[0].upper() + cleaned[1:]

        # Ensure complete sentence ending with period.
        if not cleaned.endswith((".", "!", "?")):
            cleaned += "."

        return cleaned

    @staticmethod
    def _clean_chunk_text(text: str) -> str:
        """Remove document noise from retrieved chunk text."""
        if not text:
            return ""

        cleaned = text.strip()

        # Strip prefixes
        prefixes = [
            "Policy wording:",
            "Policy wording -",
            "Policy Wording:",
            "Policy Wording -",
            "policy wording:",
            "policy wording -",
        ]
        for prefix in prefixes:
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip()
            cleaned = cleaned.replace(prefix, " ")

        # Remove page references
        cleaned = re.sub(r"\(?Page\s+(?:No\.?\s*)?\d+\s*(?:of\s*\d+)?\)?\b", "", cleaned, flags=re.IGNORECASE)

        # Remove URN / document references
        cleaned = re.sub(r"URN:?\s*IRDA[A-Z0-9/]+", "", cleaned)
        cleaned = re.sub(r"IRDA[A-Z0-9/]{10,}", "", cleaned)
        cleaned = re.sub(r"\b(?:CIN|GSTIN|GST):?\s*[A-Z0-9]{8,}\b", "", cleaned, flags=re.IGNORECASE)

        # Remove section/chunk markers
        cleaned = re.sub(r"\b(?:Chunk|Rank|Section|Clause)\s*#?\d+[:.]?\s*", "", cleaned, flags=re.IGNORECASE)

        # Remove document boilerplate and metadata noise.
        cleaned = re.sub(r"\b(?:www\.|https?://)\S+\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b", "", cleaned)
        cleaned = re.sub(r"\b(?:Tel|Phone|Mob(?:ile)?)\.?:?\s*\+?[\d\s().-]{6,}\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b[A-Z]{1,4}\d{6,}[A-Z0-9/-]*\b", "", cleaned)
        cleaned = re.sub(r"\b(?:logo|copyright|all rights reserved)\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b(?:page|pg)\s*\d+\s*(?:of\s*\d+)?\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(
            r"\b(?:[A-Z][a-z]+\s+){1,5}(?:Insurance|General|Company|Limited|Pvt|Private|Public|LLP|Ltd)\b(?:\s+(?:Insurance|General|Company|Limited|Pvt|Private|Public|LLP|Ltd))*\b",
            "",
            cleaned,
        )

        # Strip trailing ellipses
        cleaned = re.sub(r"[\s.]*(?:\.\.\.|…)+$", "", cleaned).strip()

        # Collapse whitespace
        cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()

        return cleaned

    @staticmethod
    def _is_incomplete_sentence(text: str) -> bool:
        clean = " ".join((text or "").split()).strip()
        if not clean:
            return True
        if "..." in clean or "…" in clean:
            return True
        words = re.findall(r"[A-Za-z]+", clean)
        if len(words) < 3:
            return True
        lower = clean.lower()
        if re.search(r"[:;,\-]\s*$", lower):
            return True
        trailing = words[-1].lower()
        dangling = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "to",
            "from",
            "of",
            "with",
            "under",
            "over",
            "for",
            "by",
            "in",
            "on",
            "at",
            "as",
            "if",
            "when",
            "where",
            "which",
            "that",
            "shall",
            "will",
            "be",
            "is",
            "are",
            "were",
            "was",
            "any",
            "such",
            "including",
            "between",
            "against",
            "into",
            "through",
            "during",
            "before",
            "after",
            "above",
            "below",
            "without",
            "within",
        }
        if trailing in dangling:
            return True
        return False

    @staticmethod
    def _format_as_point_list(text: str, limit: int = 5) -> list[str]:
        """Convert raw text into clean, individual evidence points."""
        if not text or text == INFO_NOT_AVAILABLE_MESSAGE:
            return [INFO_NOT_AVAILABLE_MESSAGE]

        normalized = text.replace("\r\n", "\n").replace("\r", "\n")
        normalized = re.sub(
            r"(?<=\S)\s+(?=(?:•|▪|▸|►|-|\*|\(?\d+[.)]|\(?[a-zA-Z][.)]|\(?[ivxIVX]+[.)])\s+)",
            "\n",
            normalized,
        )

        raw_lines = normalized.split("\n")
        candidates: list[str] = []

        for line in raw_lines:
            line = line.strip()
            if not line:
                continue

            parts = re.split(r"[•▪▸►]", line)
            for part in parts:
                part = part.strip()
                if not part:
                    continue

                if len(part) > 120 and (". " in part or "; " in part):
                    sentences = re.split(r"(?<=[.?!;])\s+(?=[A-Z])", part)
                    for s in sentences:
                        pt = ComparisonService._clean_single_point(s)
                        if pt and not ComparisonService._is_junk_fragment(pt):
                            candidates.append(pt)
                else:
                    pt = ComparisonService._clean_single_point(part)
                    if pt and not ComparisonService._is_junk_fragment(pt):
                        candidates.append(pt)

        unique_candidates: list[str] = []
        seen = set()
        for c in candidates:
            key = c.lower()
            if key not in seen and len(c) >= 12:
                seen.add(key)
                unique_candidates.append(c)

        if not unique_candidates:
            return [INFO_NOT_AVAILABLE_MESSAGE]

        return unique_candidates[:limit]

    def _extract_json_block(self, text: str) -> str | None:
        if not text:
            return None
        for opener, closer in (("{", "}"), ("[", "]")):
            start = text.find(opener)
            if start == -1:
                continue
            depth = 0
            for index, ch in enumerate(text[start:], start):
                if ch == opener:
                    depth += 1
                elif ch == closer:
                    depth -= 1
                    if depth == 0:
                        return text[start : index + 1]
        return None

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
        if recommended_policy_ids and not selected.issubset(recommended_policy_ids):
            logger.info(
                "Selected policies %s for comparison in session %s include non-recommended policies",
                selected,
                request.session_id,
            )

    @staticmethod
    def _shorten_text(text: str, limit: int = 900) -> str:
        """Shorten text to limit, cutting at last complete sentence instead of truncating with '...'."""
        cleaned = " ".join((text or "").split())
        if len(cleaned) <= limit:
            return cleaned

        # Cut at the last sentence boundary within the limit
        truncated = cleaned[:limit]
        # Find the last sentence-ending punctuation
        last_period = truncated.rfind(".")
        last_question = truncated.rfind("?")
        last_exclamation = truncated.rfind("!")
        last_boundary = max(last_period, last_question, last_exclamation)

        if last_boundary > limit * 0.3:  # Only cut at sentence if it's past 30% of limit
            return truncated[: last_boundary + 1].strip()

        # Fallback: cut at last word boundary
        return truncated.rsplit(" ", 1)[0].rstrip(".,;:-") + "."

    @staticmethod
    def _is_junk_fragment(text: str) -> bool:
        """Check if a text fragment is junk that should be filtered out."""
        lower = text.lower().strip()
        # Too short
        if len(lower) < 12:
            return True
        if ComparisonService._is_incomplete_sentence(text):
            return True
        # Page references
        if re.match(r"^page\s+\d+", lower):
            return True
        # URN / document codes
        if re.match(r"^(urn|irda)", lower):
            return True
        # Contact or metadata only.
        if re.search(r"(?:www\.|http://|https://|@)", lower):
            return True
        if re.search(r"\b(?:tel|phone|mobile|fax)\b", lower):
            return True
        if re.search(r"\b(?:registration|cin|gst|irda)\b", lower) and len(lower) < 80:
            return True
        if re.search(r"\b(?:logo|page|footer|header)\b", lower) and len(lower) < 80:
            return True
        # Insurer boilerplate and legal-company metadata.
        if re.search(
            r"\b(?:general insurance company limited|insurance company limited|company limited|pvt\.?\s*ltd|private limited|public limited|limited)\b",
            lower,
        ):
            return True
        if re.search(r"\b(?:sbi|hdfc|icici|new india|oriental|tata|liberty|royal sundaram|reliance)\b.*\b(?:insurance|general|company|limited)\b", lower):
            return True
        # Just numbering with minimal text
        if re.match(r"^[a-z0-9ivx]+[.)]+\s*.{0,10}$", lower):
            return True
        if lower.startswith("policy wording") and len(lower) < 40:
            return True
        return False

    @staticmethod
    def _point_similarity_key(text: str) -> str:
        return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()

    def _dedupe_points(self, points: list[str], limit: int = 5) -> list[str]:
        unique: list[str] = []
        seen: set[str] = set()
        for point in points:
            key = self._point_similarity_key(point)
            if not key or key in seen:
                continue
            # Near-duplicate suppression for same fact with minor phrasing changes.
            if any(
                key in existing or existing in key
                for existing in seen
                if len(key) > 24 and len(existing) > 24
            ):
                continue
            seen.add(key)
            unique.append(point)
            if len(unique) >= limit:
                break
        return unique

    def _normalize_point_list(self, value: str | list[str] | None, limit: int = 5) -> list[str]:
        if value is None:
            return [INFO_NOT_AVAILABLE_MESSAGE]

        raw_points: list[str]
        if isinstance(value, list):
            raw_points = [str(item) for item in value]
        else:
            normalized = str(value).replace("\r\n", "\n").replace("\r", "\n")
            normalized = re.sub(
                r"(?<=\S)\s+(?=(?:•|▪|▸|►|-|\*|\(?\d+[.)]|\(?[a-zA-Z][.)]|\(?[ivxIVX]+[.)])\s+)",
                "\n",
                normalized,
            )
            raw_points = [part.strip() for part in re.split(r"[\n]+", normalized) if part.strip()]

        cleaned_points: list[str] = []
        for point in raw_points:
            nested = [part.strip() for part in re.split(r"[•▪▸►]", point) if part.strip()]
            candidates = nested or [point]
            for candidate in candidates:
                clean = self._clean_single_point(candidate)
                if clean and not self._is_junk_fragment(clean):
                    cleaned_points.append(clean)

        deduped = self._dedupe_points(cleaned_points, limit=limit)
        return deduped or [INFO_NOT_AVAILABLE_MESSAGE]

    def _extract_points_from_text(
        self,
        text: str,
        terms: tuple[str, ...] | None = None,
        limit: int = 4,
        max_length: int = 180,
    ) -> list[str]:
        import re

        if not text:
            return []

        # Pre-split inline list markers: 1) ... 2) ... or a) ... b) ...
        raw = text.replace("\r\n", "\n").replace("\r", "\n")
        raw = re.sub(
            r"(?<=\S)\s+(?=(?:•|▪|▸|►|-|\*|\(?\d+[.)]|\(?[a-zA-Z][.)]|\(?[ivxIVX]+[.)])\s+)",
            "\n",
            raw,
        )

        # Split by newlines, periods, or semicolons
        parts: list[str] = []
        for line in raw.split("\n"):
            line = line.strip()
            if not line:
                continue
            sub_parts = re.split(r"(?<=[.?!;])\s+(?=[A-Z])", line)
            for sp in sub_parts:
                clean_pt = self._clean_single_point(sp)
                if clean_pt and not self._is_junk_fragment(clean_pt):
                    parts.append(clean_pt)

        candidates = []
        for sentence in parts:
            if len(sentence) < 15:
                continue
            lower = sentence.lower()
            if terms and not any(term in lower for term in terms):
                continue
            shortened = self._shorten_text(sentence, max_length)
            clean_short = self._clean_single_point(shortened)
            if clean_short and not self._is_junk_fragment(clean_short):
                candidates.append(clean_short)
            if len(candidates) >= limit:
                break

        # Fallback if term-filtering produced no candidates
        if not candidates and terms:
            for sentence in parts:
                if len(sentence) >= 15:
                    shortened = self._shorten_text(sentence, max_length)
                    clean_short = self._clean_single_point(shortened)
                    if clean_short and not self._is_junk_fragment(clean_short):
                        candidates.append(clean_short)
                    if len(candidates) >= limit:
                        break

        # Ultimate fallback if sentence splitting produced no candidates
        if not candidates and text:
            clean_short = self._clean_single_point(self._shorten_text(text, max_length))
            if clean_short and not self._is_junk_fragment(clean_short):
                candidates.append(clean_short)

        return list(dict.fromkeys(candidates))[:limit]

    def _format_pointwise_value(self, chunks: list[dict]) -> list[str]:
        if not chunks:
            return [INFO_NOT_AVAILABLE_MESSAGE]

        points: list[str] = []
        seen: set[str] = set()

        for chunk in chunks[:5]:
            chunk_text = chunk.get("text", "")
            if not chunk_text:
                continue
            extracted = self._extract_points_from_text(chunk_text, limit=3, max_length=160)
            for item in extracted:
                clean_item = self._clean_single_point(item)
                if clean_item and not self._is_junk_fragment(clean_item):
                    key = clean_item.lower()
                    if key not in seen:
                        seen.add(key)
                        points.append(clean_item)
                        if len(points) >= 5:
                            return points[:5]

        if points:
            return points[:5]

        # Fallback if chunks exist but points is empty
        for chunk in chunks:
            raw = chunk.get("text", "")
            clean_pt = self._clean_single_point(raw)
            if clean_pt and not self._is_junk_fragment(clean_pt):
                return [self._shorten_text(clean_pt, 200)]

        return [INFO_NOT_AVAILABLE_MESSAGE]

    def _format_retrieved_value(self, chunks: list[dict]) -> list[str]:
        if not chunks:
            return [INFO_NOT_AVAILABLE_MESSAGE]

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
            cleaned_text = self._clean_chunk_text(policy_a_chunks[0].get("text", ""))
            evidence_parts.append(
                f"Policy A evidence ({meta.get('section_name') or section_name}): "
                f"{self._shorten_text(cleaned_text, 350)}"
            )
        if policy_b_chunks:
            meta = policy_b_chunks[0].get("metadata", {})
            cleaned_text = self._clean_chunk_text(policy_b_chunks[0].get("text", ""))
            evidence_parts.append(
                f"Policy B evidence ({meta.get('section_name') or section_name}): "
                f"{self._shorten_text(cleaned_text, 350)}"
            )
        return "\n\n".join(evidence_parts) or INFO_NOT_AVAILABLE_MESSAGE

    def _build_risk_alignment_from_context(
        self,
        risk_scores: list,
        section_chunks: dict[str, dict[str, list[dict]]],
    ) -> list[dict[str, str]]:
        """Build business risk alignment entries from risk scores + coverage chunks."""
        if not risk_scores:
            return []

        coverage_chunks_a = section_chunks.get("Coverage", {}).get("A", []) + \
            section_chunks.get("What is Covered", {}).get("A", [])
        coverage_chunks_b = section_chunks.get("Coverage", {}).get("B", []) + \
            section_chunks.get("What is Covered", {}).get("B", [])

        all_text_a = " ".join(c.get("text", "") for c in coverage_chunks_a).lower()
        all_text_b = " ".join(c.get("text", "") for c in coverage_chunks_b).lower()

        risk_keyword_map = {
            "fire": ["fire", "flame", "explosion", "lightning", "burn"],
            "theft": ["theft", "burglary", "robbery", "steal", "break-in"],
            "transit": ["transit", "transport", "cargo", "shipping", "conveyance"],
            "flood": ["flood", "inundation", "water damage", "storm"],
            "earthquake": ["earthquake", "seismic"],
            "liability": ["liability", "third party", "legal", "negligence"],
            "machinery": ["machinery", "equipment", "breakdown", "boiler"],
            "business interruption": ["interruption", "loss of profit", "consequential"],
            "cyber": ["cyber", "data breach", "electronic", "computer"],
            "employee": ["employee", "worker", "workmen", "compensation"],
        }

        rows: list[dict[str, str]] = []
        for rs in sorted(risk_scores, key=lambda x: x.score, reverse=True)[:5]:
            category_lower = rs.category.lower()
            keywords = []
            for key, kws in risk_keyword_map.items():
                if key in category_lower or any(k in category_lower for k in kws):
                    keywords = kws
                    break
            if not keywords:
                keywords = category_lower.split()

            a_covered = any(kw in all_text_a for kw in keywords)
            b_covered = any(kw in all_text_b for kw in keywords)

            level = rs.level.capitalize()
            a_status = (
                "The retrieved evidence specifically addresses this risk."
                if a_covered
                else NOT_SPECIFICALLY_ADDRESSED_MESSAGE
            )
            b_status = (
                "The retrieved evidence specifically addresses this risk."
                if b_covered
                else NOT_SPECIFICALLY_ADDRESSED_MESSAGE
            )
            rows.append(
                BusinessRiskItem(
                    risk_category=rs.category,
                    risk_level=level,
                    policy_a=a_status,
                    policy_b=b_status,
                )
            )

        return rows

    def _build_risk_alignment_context_for_prompt(
        self,
        risk_scores: list,
    ) -> str:
        """Build risk score context text to include in the LLM prompt."""
        if not risk_scores:
            return ""

        lines = []
        for rs in sorted(risk_scores, key=lambda x: x.score, reverse=True):
            pct = round(rs.score * 100)
            lines.append(f"- {rs.category}: {pct}% ({rs.level} risk)")
        return "\n".join(lines)

    def _build_coverage_gap_analysis(
        self,
        comparisons: list[dict] | list[ComparisonItem],
    ) -> CoverageGapAnalysis:
        a_points = set()
        b_points = set()
        for item in comparisons:
            val_a = item.get("policy_a_value", []) if isinstance(item, dict) else item.policy_a_value
            val_b = item.get("policy_b_value", []) if isinstance(item, dict) else item.policy_b_value
            for p in val_a:
                if p != INFO_NOT_AVAILABLE_MESSAGE:
                    a_points.add(self._point_similarity_key(p))
            for p in val_b:
                if p != INFO_NOT_AVAILABLE_MESSAGE:
                    b_points.add(self._point_similarity_key(p))

        both = sorted(a_points & b_points)
        only_a = sorted(a_points - b_points)
        only_b = sorted(b_points - a_points)
        neither = (
            [INFO_NOT_AVAILABLE_MESSAGE]
            if not a_points and not b_points
            else []
        )
        return CoverageGapAnalysis(
            covered_by_both=[
                "Common coverage evidence is present in both policies."
            ]
            if both
            else [INFO_NOT_AVAILABLE_MESSAGE],
            covered_only_by_a=[
                "Retrieved evidence shows coverage points present only in Policy A."
            ]
            if only_a
            else [INFO_NOT_AVAILABLE_MESSAGE],
            covered_only_by_b=[
                "Retrieved evidence shows coverage points present only in Policy B."
            ]
            if only_b
            else [INFO_NOT_AVAILABLE_MESSAGE],
            covered_by_neither=neither or [INFO_NOT_AVAILABLE_MESSAGE],
        )

    def _build_overall_recommendation(
        self,
        comparisons: list[dict] | list[ComparisonItem],
    ) -> list[str]:
        stronger_counts = {"a": 0, "b": 0}
        for item in comparisons:
            stronger = item.get("stronger") if isinstance(item, dict) else item.stronger
            if stronger in stronger_counts:
                stronger_counts[stronger] += 1

        if stronger_counts["a"] == 0 and stronger_counts["b"] == 0:
            return [
                NO_WINNER_MESSAGE,
                "The retrieved policy sections do not contain sufficient evidence to distinguish a superior option for the business profile.",
            ]
        if stronger_counts["a"] == stronger_counts["b"]:
            return [
                NO_WINNER_MESSAGE,
                "Both policies demonstrate comparable alignment across the retrieved evidence categories.",
            ]
        winner = "Policy A" if stronger_counts["a"] > stronger_counts["b"] else "Policy B"
        return [
            f"{winner} is better aligned with the available evidence for this comparison.",
            "The recommendation is based on category-level findings supported by retrieved policy wording and business risk context.",
        ]

    def _chunks_to_compare_response(
        self,
        policy_a_name: str,
        policy_b_name: str,
        section_chunks: dict[str, dict[str, list[dict]]],
        risk_scores: list | None = None,
    ) -> CompareResponse:
        comparisons: list[ComparisonItem] = []
        missing_information = []

        for section_name in REQUIRED_COMPARISON_CATEGORIES:
            chunks_by_policy = section_chunks.get(section_name, {})
            policy_a_chunks = chunks_by_policy.get("A", [])
            policy_b_chunks = chunks_by_policy.get("B", [])
            has_a = bool(policy_a_chunks)
            has_b = bool(policy_b_chunks)
            if not has_a:
                missing_information.append(f"{section_name}: Policy A")
            if not has_b:
                missing_information.append(f"{section_name}: Policy B")

            comparisons.append(
                ComparisonItem(
                    category=section_name,
                    policy_a_value=self._format_retrieved_value(policy_a_chunks),
                    policy_b_value=self._format_retrieved_value(policy_b_chunks),
                    stronger=STRONGER_INSUFFICIENT_EVIDENCE,
                    evidence=self._format_evidence(
                        section_name,
                        policy_a_chunks,
                        policy_b_chunks,
                    ),
                    confidence=CONFIDENCE_MEDIUM
                    if has_a and has_b
                    else CONFIDENCE_LOW,
                )
            )

        available_sections = [c.category for c in comparisons if any(
            p != INFO_NOT_AVAILABLE_MESSAGE for p in (c.policy_a_value + c.policy_b_value)
        )]
        executive_summary = (
            [
                f"Both {policy_a_name} and {policy_b_name} provide terms documented in the retrieved policy sections.",
                "The key differences depend on category-specific provisions detailed in the side-by-side comparison below.",
            ]
            if available_sections
            else [
                f"No meaningful retrieved evidence was found for {policy_a_name} and {policy_b_name}.",
                "Information not available in the selected policies.",
            ]
        )

        coverage_chunks_a = (
            section_chunks.get("Coverage", {}).get("A", [])
            + section_chunks.get("What is Covered", {}).get("A", [])
        )
        coverage_chunks_b = (
            section_chunks.get("Coverage", {}).get("B", [])
            + section_chunks.get("What is Covered", {}).get("B", [])
        )

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

        business_risk_alignment = self._build_risk_alignment_from_context(
            risk_scores or [],
            section_chunks,
        )

        limitations_a = self._extract_policy_points(all_chunks_a, LIMITATION_TERMS, limit=4)
        limitations_b = self._extract_policy_points(all_chunks_b, LIMITATION_TERMS, limit=4)
        advantages_a = self._extract_policy_points(coverage_chunks_a or all_chunks_a, ADVANTAGE_TERMS, limit=4)
        advantages_b = self._extract_policy_points(coverage_chunks_b or all_chunks_b, ADVANTAGE_TERMS, limit=4)

        advantages_a = [
            point for point in advantages_a
            if point != INFO_NOT_AVAILABLE_MESSAGE and not any(m in point.lower() for m in ADVANTAGE_NEGATION_TERMS)
        ] or [INFO_NOT_AVAILABLE_MESSAGE]
        advantages_b = [
            point for point in advantages_b
            if point != INFO_NOT_AVAILABLE_MESSAGE and not any(m in point.lower() for m in ADVANTAGE_NEGATION_TERMS)
        ] or [INFO_NOT_AVAILABLE_MESSAGE]

        limitations_key_a = {self._point_similarity_key(p) for p in limitations_a if p != INFO_NOT_AVAILABLE_MESSAGE}
        limitations_key_b = {self._point_similarity_key(p) for p in limitations_b if p != INFO_NOT_AVAILABLE_MESSAGE}
        advantages_a = [
            p for p in advantages_a
            if p == INFO_NOT_AVAILABLE_MESSAGE or self._point_similarity_key(p) not in limitations_key_a
        ] or [INFO_NOT_AVAILABLE_MESSAGE]
        advantages_b = [
            p for p in advantages_b
            if p == INFO_NOT_AVAILABLE_MESSAGE or self._point_similarity_key(p) not in limitations_key_b
        ] or [INFO_NOT_AVAILABLE_MESSAGE]

        return CompareResponse(
            executive_summary=executive_summary,
            comparisons=comparisons,
            coverage_gap_analysis=self._build_coverage_gap_analysis(comparisons),
            business_risk_alignment=business_risk_alignment,
            advantages_a=self._normalize_point_list(advantages_a, limit=4),
            advantages_b=self._normalize_point_list(advantages_b, limit=4),
            limitations_a=self._normalize_point_list(limitations_a, limit=4),
            limitations_b=self._normalize_point_list(limitations_b, limit=4),
            overall_recommendation=self._build_overall_recommendation(comparisons),
            missing_information=missing_information or [INFO_NOT_AVAILABLE_MESSAGE],
            overall_confidence=CONFIDENCE_MEDIUM if available_sections else CONFIDENCE_LOW,
        )

    def _compact_chunks_for_prompt(self, chunks: list[dict], limit: int = 550) -> str:
        if not chunks:
            return INFO_NOT_AVAILABLE_MESSAGE

        entries = []
        seen = set()
        for chunk in chunks[:4]:
            meta = chunk.get("metadata", {})
            section_name = meta.get("section_name") or "Retrieved section"
            cleaned_text = self._clean_chunk_text(chunk.get("text", ""))
            if not cleaned_text:
                continue
            key = self._point_similarity_key(cleaned_text[:80])
            if key in seen:
                continue
            seen.add(key)
            entries.append(
                f"{section_name}: {self._shorten_text(cleaned_text, limit)}"
            )
        return "\n".join(entries) if entries else INFO_NOT_AVAILABLE_MESSAGE

    def _extract_policy_points(
        self,
        chunks: list[dict],
        terms: tuple[str, ...] | None = None,
        limit: int = 4,
    ) -> list[str]:
        points = []
        for chunk in chunks:
            chunk_text = self._clean_chunk_text(chunk.get("text", ""))
            if not chunk_text:
                continue
            points.extend(
                self._extract_points_from_text(
                    chunk_text,
                    terms=terms,
                    limit=2,
                    max_length=150,
                )
            )
            if len(points) >= limit:
                break

        # Fallback without terms if terms filtering yielded no points
        if not points and terms and chunks:
            for chunk in chunks:
                chunk_text = self._clean_chunk_text(chunk.get("text", ""))
                if not chunk_text:
                    continue
                points.extend(
                    self._extract_points_from_text(
                        chunk_text,
                        terms=None,
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
        risk_scores: list | None = None,
    ) -> CompareResponse:
        section_map = {item.category: item for item in response.comparisons}
        normalized_comparisons = []
        for category in REQUIRED_COMPARISON_CATEGORIES:
            item = section_map.get(category)
            chunks_by_policy = section_chunks.get(category, {"A": [], "B": []})
            has_a = bool(chunks_by_policy.get("A"))
            has_b = bool(chunks_by_policy.get("B"))

            if item is None:
                normalized_comparisons.append(
                    ComparisonItem(
                        category=category,
                        policy_a_value=self._format_retrieved_value(chunks_by_policy.get("A", [])),
                        policy_b_value=self._format_retrieved_value(chunks_by_policy.get("B", [])),
                        stronger=STRONGER_INSUFFICIENT_EVIDENCE,
                        evidence=self._format_evidence(
                            category,
                            chunks_by_policy.get("A", []),
                            chunks_by_policy.get("B", []),
                        ),
                        confidence=CONFIDENCE_LOW,
                    )
                )
                continue

            item.policy_a_value = self._normalize_point_list(
                item.policy_a_value if has_a else [INFO_NOT_AVAILABLE_MESSAGE],
                limit=5,
            )
            item.policy_b_value = self._normalize_point_list(
                item.policy_b_value if has_b else [INFO_NOT_AVAILABLE_MESSAGE],
                limit=5,
            )
            item.evidence = self._clean_single_point(item.evidence) or INFO_NOT_AVAILABLE_MESSAGE
            if not has_a or not has_b:
                item.stronger = STRONGER_INSUFFICIENT_EVIDENCE
            normalized_comparisons.append(item)
        response.comparisons = normalized_comparisons

        response.executive_summary = self._normalize_point_list(
            response.executive_summary, limit=2
        )[:2]
        if len(response.executive_summary) < 2:
            response.executive_summary = [
                response.executive_summary[0] if response.executive_summary else INFO_NOT_AVAILABLE_MESSAGE,
                INFO_NOT_AVAILABLE_MESSAGE,
            ]

        response.overall_recommendation = self._normalize_point_list(
            response.overall_recommendation, limit=3
        )[:3]
        if len(response.overall_recommendation) < 2:
            response.overall_recommendation = self._build_overall_recommendation(
                [item.model_dump() for item in response.comparisons]
            )

        response.advantages_a = self._normalize_point_list(response.advantages_a, limit=4)
        response.advantages_b = self._normalize_point_list(response.advantages_b, limit=4)
        response.limitations_a = self._normalize_point_list(response.limitations_a, limit=4)
        response.limitations_b = self._normalize_point_list(response.limitations_b, limit=4)

        response.advantages_a = [
            p for p in response.advantages_a if p == INFO_NOT_AVAILABLE_MESSAGE or not any(t in p.lower() for t in ADVANTAGE_NEGATION_TERMS)
        ] or [INFO_NOT_AVAILABLE_MESSAGE]
        response.advantages_b = [
            p for p in response.advantages_b if p == INFO_NOT_AVAILABLE_MESSAGE or not any(t in p.lower() for t in ADVANTAGE_NEGATION_TERMS)
        ] or [INFO_NOT_AVAILABLE_MESSAGE]

        limitations_key_a = {self._point_similarity_key(p) for p in response.limitations_a if p != INFO_NOT_AVAILABLE_MESSAGE}
        limitations_key_b = {self._point_similarity_key(p) for p in response.limitations_b if p != INFO_NOT_AVAILABLE_MESSAGE}
        response.advantages_a = [
            p for p in response.advantages_a
            if p == INFO_NOT_AVAILABLE_MESSAGE or self._point_similarity_key(p) not in limitations_key_a
        ] or [INFO_NOT_AVAILABLE_MESSAGE]
        response.advantages_b = [
            p for p in response.advantages_b
            if p == INFO_NOT_AVAILABLE_MESSAGE or self._point_similarity_key(p) not in limitations_key_b
        ] or [INFO_NOT_AVAILABLE_MESSAGE]

        for key in (
            "covered_by_both",
            "covered_only_by_a",
            "covered_only_by_b",
            "covered_by_neither",
        ):
            val = getattr(response.coverage_gap_analysis, key, None)
            if val is not None:
                setattr(
                    response.coverage_gap_analysis,
                    key,
                    self._normalize_point_list(val, limit=4),
                )

        if not response.business_risk_alignment or len(response.business_risk_alignment) < 3:
            response.business_risk_alignment = self._build_risk_alignment_from_context(
                risk_scores or [],
                section_chunks,
            )
        else:
            for item in response.business_risk_alignment:
                pa = self._clean_single_point(item.policy_a) or item.policy_a
                pb = self._clean_single_point(item.policy_b) or item.policy_b
                if not pa or any(m in pa.lower() for m in ("not specifically addressed", "not addressed", "no evidence", "information not available")):
                    item.policy_a = NOT_SPECIFICALLY_ADDRESSED_MESSAGE
                else:
                    item.policy_a = pa
                if not pb or any(m in pb.lower() for m in ("not specifically addressed", "not addressed", "no evidence", "information not available")):
                    item.policy_b = NOT_SPECIFICALLY_ADDRESSED_MESSAGE
                else:
                    item.policy_b = pb

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

    def _normalize_compare_payload(
        self,
        payload: dict,
        section_chunks: dict[str, dict[str, list[dict]]],
        risk_scores: list | None = None,
    ) -> dict:
        rows = payload.get("comparisons") if isinstance(payload, dict) else None
        row_map = {}
        if isinstance(rows, list):
            for row in rows:
                if not isinstance(row, dict):
                    continue
                category = str(row.get("category", "")).strip()
                if category:
                    row_map[category] = row

        comparisons = []
        for category in REQUIRED_COMPARISON_CATEGORIES:
            src = row_map.get(category, {})
            chunks_by_policy = section_chunks.get(category, {"A": [], "B": []})
            has_a = bool(chunks_by_policy.get("A"))
            has_b = bool(chunks_by_policy.get("B"))

            policy_a_val = self._normalize_point_list(
                src.get("policy_a_value")
                if (src and has_a)
                else self._format_retrieved_value(chunks_by_policy.get("A", [])),
                limit=5,
            )
            policy_b_val = self._normalize_point_list(
                src.get("policy_b_value")
                if (src and has_b)
                else self._format_retrieved_value(chunks_by_policy.get("B", [])),
                limit=5,
            )

            # If no chunks were retrieved for a policy in this category, enforce unavailable
            if not has_a:
                policy_a_val = [INFO_NOT_AVAILABLE_MESSAGE]
            if not has_b:
                policy_b_val = [INFO_NOT_AVAILABLE_MESSAGE]

            stronger_val = src.get("stronger")
            if stronger_val not in {"a", "b", "equal", "insufficient_evidence"}:
                stronger_val = STRONGER_INSUFFICIENT_EVIDENCE
            if not has_a or not has_b:
                stronger_val = STRONGER_INSUFFICIENT_EVIDENCE

            comparisons.append(
                {
                    "category": category,
                    "policy_a_value": policy_a_val,
                    "policy_b_value": policy_b_val,
                    "stronger": stronger_val,
                    "evidence": self._clean_single_point(str(src.get("evidence", "")))
                    or self._format_evidence(
                        category,
                        chunks_by_policy.get("A", []),
                        chunks_by_policy.get("B", []),
                    ),
                    "confidence": src.get("confidence")
                    if src.get("confidence") in {"high", "medium", "low"}
                    else (CONFIDENCE_MEDIUM if (has_a and has_b) else CONFIDENCE_LOW),
                }
            )

        # Normalize Business Risk Alignment
        raw_risk = payload.get("business_risk_alignment", [])
        risk_alignment = []
        if isinstance(raw_risk, list) and len(raw_risk) >= 3:
            for item in raw_risk:
                if isinstance(item, dict):
                    pa = str(item.get("policy_a", "")).strip()
                    pb = str(item.get("policy_b", "")).strip()
                    pa = self._clean_single_point(pa) or pa
                    pb = self._clean_single_point(pb) or pb
                    if not pa or any(m in pa.lower() for m in ("not specifically addressed", "not addressed", "no evidence", "information not available")):
                        pa = NOT_SPECIFICALLY_ADDRESSED_MESSAGE
                    if not pb or any(m in pb.lower() for m in ("not specifically addressed", "not addressed", "no evidence", "information not available")):
                        pb = NOT_SPECIFICALLY_ADDRESSED_MESSAGE
                    risk_alignment.append(
                        {
                            "risk_category": str(item.get("risk_category", "Business Risk")).strip() or "Business Risk",
                            "risk_level": str(item.get("risk_level", "Medium")).strip().capitalize() or "Medium",
                            "policy_a": pa,
                            "policy_b": pb,
                        }
                    )
        if len(risk_alignment) < 3:
            risk_alignment = [
                r.model_dump() if hasattr(r, "model_dump") else r
                for r in self._build_risk_alignment_from_context(risk_scores or [], section_chunks)
            ]

        # Normalize Executive Summary (must be exactly 2 complete sentences)
        raw_exec = payload.get("executive_summary")
        executive_summary = self._normalize_point_list(raw_exec, limit=2)
        executive_summary = [p for p in executive_summary if p != INFO_NOT_AVAILABLE_MESSAGE][:2]
        if len(executive_summary) == 0:
            executive_summary = [
                "Both policies provide core insurance protection based on the retrieved policy wording.",
                "The primary differences lie in specific exclusions and operational conditions identified in the comparison.",
            ]
        elif len(executive_summary) == 1:
            executive_summary.append(
                "Key differences between the two policies are reflected in the category-level analysis below."
            )

        # Normalize Advantages & Limitations
        adv_a = self._normalize_point_list(payload.get("advantages_a"), limit=4)
        adv_b = self._normalize_point_list(payload.get("advantages_b"), limit=4)
        lim_a = self._normalize_point_list(payload.get("limitations_a"), limit=4)
        lim_b = self._normalize_point_list(payload.get("limitations_b"), limit=4)

        adv_a = [p for p in adv_a if p == INFO_NOT_AVAILABLE_MESSAGE or not any(t in p.lower() for t in ADVANTAGE_NEGATION_TERMS)] or [INFO_NOT_AVAILABLE_MESSAGE]
        adv_b = [p for p in adv_b if p == INFO_NOT_AVAILABLE_MESSAGE or not any(t in p.lower() for t in ADVANTAGE_NEGATION_TERMS)] or [INFO_NOT_AVAILABLE_MESSAGE]

        lim_key_a = {self._point_similarity_key(p) for p in lim_a if p != INFO_NOT_AVAILABLE_MESSAGE}
        lim_key_b = {self._point_similarity_key(p) for p in lim_b if p != INFO_NOT_AVAILABLE_MESSAGE}
        adv_a = [p for p in adv_a if p == INFO_NOT_AVAILABLE_MESSAGE or self._point_similarity_key(p) not in lim_key_a] or [INFO_NOT_AVAILABLE_MESSAGE]
        adv_b = [p for p in adv_b if p == INFO_NOT_AVAILABLE_MESSAGE or self._point_similarity_key(p) not in lim_key_b] or [INFO_NOT_AVAILABLE_MESSAGE]

        # Normalize Overall Recommendation (must be 2-3 complete sentences)
        raw_rec = payload.get("overall_recommendation")
        rec_list = self._normalize_point_list(raw_rec, limit=3)
        rec_list = [p for p in rec_list if p != INFO_NOT_AVAILABLE_MESSAGE][:3]
        if len(rec_list) < 2:
            rec_list = self._build_overall_recommendation(comparisons)
        stronger_a = sum(1 for c in comparisons if c.get("stronger") == "a")
        stronger_b = sum(1 for c in comparisons if c.get("stronger") == "b")
        if stronger_a == 0 and stronger_b == 0 and not any(NO_WINNER_MESSAGE.lower() in r.lower() for r in rec_list):
            rec_list = [
                NO_WINNER_MESSAGE,
                "The retrieved policy sections do not contain sufficient evidence to distinguish a superior option for the business profile.",
            ]

        raw_gaps = payload.get("coverage_gap_analysis")
        if isinstance(raw_gaps, dict):
            gap_analysis = {
                k: self._normalize_point_list(raw_gaps.get(k), limit=4)
                for k in ("covered_by_both", "covered_only_by_a", "covered_only_by_b", "covered_by_neither")
            }
        else:
            gap_analysis = self._build_coverage_gap_analysis(comparisons).model_dump()

        return {
            "executive_summary": executive_summary,
            "comparisons": comparisons,
            "coverage_gap_analysis": gap_analysis,
            "business_risk_alignment": risk_alignment,
            "advantages_a": adv_a,
            "advantages_b": adv_b,
            "limitations_a": lim_a,
            "limitations_b": lim_b,
            "overall_recommendation": rec_list,
            "missing_information": self._normalize_point_list(
                payload.get("missing_information"),
                limit=10,
            ),
            "overall_confidence": payload.get("overall_confidence", CONFIDENCE_MEDIUM)
            if payload.get("overall_confidence") in {"high", "medium", "low"}
            else CONFIDENCE_MEDIUM,
        }

    async def _retrieve_section_for_policy(
        self,
        db: AsyncSession,
        policy_id: UUID,
        query: str,
        section_name: str | None,
        section_type: str | None,
        top_k: int = 5,
    ) -> list[dict]:
        try:
            chunks = await retrieve_chunks(
                db=db,
                query=query,
                policy_ids=[policy_id],
                section_type=section_type,
                top_k=top_k,
            )
            if chunks:
                return chunks

            # If strict section_type retrieval returned empty, attempt search without section_type filter
            chunks = await retrieve_chunks(
                db=db,
                query=query,
                policy_ids=[policy_id],
                section_type=None,
                top_k=top_k,
                use_detected_section_type=False,
            )
            if chunks:
                return chunks

            fallback_query = section_name or query
            if fallback_query != query:
                chunks = await retrieve_chunks(
                    db=db,
                    query=fallback_query,
                    policy_ids=[policy_id],
                    section_type=None,
                    top_k=top_k,
                    use_detected_section_type=False,
                )
                if chunks:
                    return chunks

            alternate_query = section_name or query
            if alternate_query and alternate_query != fallback_query:
                chunks = await retrieve_chunks(
                    db=db,
                    query=alternate_query,
                    policy_ids=[policy_id],
                    section_type=None,
                    top_k=top_k,
                    use_detected_section_type=False,
                )
                if chunks:
                    return chunks
        except Exception as exc:
            logger.warning(
                "Hybrid chunk retrieval failed for policy=%s section=%s: %s",
                policy_id,
                section_type,
                exc,
            )

        # Direct DB query fallback for policy chunks if hybrid retriever returns nothing
        try:
            res = await db.execute(
                select(DocumentChunk)
                .where(DocumentChunk.policy_id == policy_id)
                .order_by(DocumentChunk.chunk_index)
                .limit(20)
            )
            db_chunks = list(res.scalars().all())
            if not db_chunks:
                return []

            matched = []
            section_key = (section_type or section_name or "").lower()
            keywords = [section_key] if section_key else []
            if "cover" in section_key or "what" in section_key:
                keywords.extend(["coverage", "covered", "cover", "benefit", "scope", "indemnify", "indemnity", "insured", "peril", "risk", "loss", "damage", "property", "fire", "liability", "section"])
            elif "exclusion" in section_key:
                keywords.extend(["exclusion", "excluded", "exception", "not covered", "not liable", "limitation", "deductible", "excess", "not extend", "restrict"])
            elif "claim" in section_key:
                keywords.extend(["claim", "notice", "procedure", "notification", "settlement", "documentation", "proof", "report", "loss", "incident"])
            elif "condition" in section_key:
                keywords.extend(["condition", "duties", "obligation", "warranty", "cancellation", "compliance", "duty", "terms", "general"])

            for c in db_chunks:
                meta = c.document_metadata or {}
                stype = (meta.get("section_type") or "").lower()
                sname = (meta.get("section_name") or "").lower()
                text_lower = (c.chunk_text or "").lower()
                if any(kw in stype or kw in sname or kw in text_lower for kw in keywords if kw):
                    matched.append(c)

            chosen = matched if matched else db_chunks
            return [
                {
                    "chunk_id": str(c.id),
                    "text": c.chunk_text,
                    "policy_id": str(c.policy_id),
                    "document_id": str(c.document_id),
                    "similarity": 0.8,
                    "page_number": c.page_number,
                    "metadata": c.document_metadata or {},
                }
                for c in chosen[:top_k]
            ]
        except Exception as exc:
            try:
                await db.rollback()
            except Exception:
                pass
            logger.warning("Direct DB chunk fallback failed for policy=%s: %s", policy_id, exc)
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
            risk_scores = context.risk_scores
        except Exception as exc:
            logger.warning("Business context lookup failed for comparison: %s", exc)
            context_text = "Business context unavailable."
            risk_scores = []

        section_chunks: dict[str, dict[str, list[dict]]] = {}

        for section_name, query, section_type in COMPARISON_SECTIONS:
            policy_a_chunks = await self._retrieve_section_for_policy(
                db=db,
                policy_id=request.policy_id_a,
                query=query,
                section_name=section_name,
                section_type=section_type,
            )
            policy_b_chunks = await self._retrieve_section_for_policy(
                db=db,
                policy_id=request.policy_id_b,
                query=query,
                section_name=section_name,
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

        # Build risk alignment context for LLM prompt
        risk_alignment_context = self._build_risk_alignment_context_for_prompt(
            risk_scores,
        )

        prompt_sections = self._build_compact_prompt_sections(section_chunks)
        user_prompt = build_user_prompt(
            business_context=context_text,
            policy_a_name=policy_a_name,
            policy_a_insurer=policy_a_insurer,
            policy_b_name=policy_b_name,
            policy_b_insurer=policy_b_insurer,
            section_chunks=prompt_sections,
            risk_alignment_context=risk_alignment_context,
        )

        try:
            llm_response = await generate_response(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
                model=LLM_MODEL,
                temperature=LLM_TEMPERATURE,
            )
            clean = self._strip_json_fences(llm_response)
            parsed_payload = None
            try:
                parsed_payload = json.loads(clean)
            except (TypeError, ValueError):
                fallback_json = self._extract_json_block(llm_response)
                if fallback_json:
                    parsed_payload = json.loads(fallback_json)
            if isinstance(parsed_payload, dict):
                payload = self._normalize_compare_payload(
                    parsed_payload,
                    section_chunks=section_chunks,
                    risk_scores=risk_scores,
                )
                parsed = CompareResponse.model_validate(payload)
                result = self._normalize_compare_response(
                    parsed, section_chunks, risk_scores
                )
                return APIResponse.success_response(
                    message=COMPARISON_COMPLETED_MESSAGE,
                    data=result.model_dump(),
                )
            logger.warning(
                "Comparison LLM response could not be parsed, using fallback comparison: %s",
                llm_response,
            )
        except (ValidationError, ValueError, TypeError) as exc:
            logger.warning(
                "Comparison response validation failed, using fallback comparison: %s",
                exc,
            )
        except Exception as exc:
            logger.warning(
                "Groq comparison generation failed, using retrieved chunks: %s", exc
            )

        result = self._chunks_to_compare_response(
            policy_a_name=policy_a_name,
            policy_b_name=policy_b_name,
            section_chunks=section_chunks,
            risk_scores=risk_scores,
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
            chunks = []

        if not chunks:
            try:
                res = await db.execute(
                    select(DocumentChunk)
                    .where(DocumentChunk.policy_id.in_([request.policy_id_a, request.policy_id_b]))
                    .order_by(DocumentChunk.policy_id, DocumentChunk.chunk_index)
                    .limit(request.top_k * 2)
                )
                db_chunks = list(res.scalars().all())
                chunks = [
                    {
                        "chunk_id": str(c.id),
                        "text": c.chunk_text,
                        "policy_id": str(c.policy_id),
                        "document_id": str(c.document_id),
                        "similarity": 0.8,
                        "page_number": c.page_number,
                        "metadata": c.document_metadata or {},
                    }
                    for c in db_chunks
                ]
            except Exception as exc:
                logger.warning("Direct DB chat fallback failed: %s", exc)
                chunks = []

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
            fallback_points = self._format_pointwise_value(chunks)
            answer = "\n".join(fallback_points) if fallback_points else INFO_NOT_AVAILABLE_MESSAGE

        if isinstance(answer, list):
            answer = "\n".join(str(x) for x in answer)
        answer = str(answer or INFO_NOT_AVAILABLE_MESSAGE).strip()

        result = CompareChatResponse(
            answer=answer,
            sources=sources,
        )
        return APIResponse.success_response(
            message=CHAT_RESPONSE_GENERATED_MESSAGE,
            data=result.model_dump(),
        )


Service = ComparisonService()
