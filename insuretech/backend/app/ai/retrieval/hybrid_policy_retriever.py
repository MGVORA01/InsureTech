import asyncio
import re
from uuid import UUID

from sqlalchemy import bindparam, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocumentChunk
from app.ai.models.bge_embedding_service import generate_embedding
from app.core.logging import get_logger

_reranker = None

SECTION_KEYWORDS = {
    "exclusion": "exclusions",
    "excluded": "exclusions",
    "claim": "claims",
    "claims": "claims",
    "coverage": "coverage",
    "cover": "coverage",
    "definition": "definitions",
    "defined": "definitions",
    "condition": "conditions",
    "premium": "financial",
    "sum insured": "financial",
    "deductible": "financial",
    "excess": "financial",
    "arbitration": "legal",
    "cancellation": "legal",
    "renewal": "administrative",
    "waiting period": "conditions",
    "co-payment": "financial",
    "copayment": "financial",
    "eligibility": "conditions",
}

QUERY_EXPANSIONS = {
    "co-payment": "copayment co payment",
    "deductible": "excess",
    "waiting period": "waiting exclusion",
    "sum insured": "limit indemnity",
    "room rent": "room accommodation limit",
}

RISK_TO_CATEGORIES = {
    "fire": ["Fire & Property", "Business Package", "Industry_All_risk"],
    "burglary": ["bulgary", "Business Package"],
    "theft": ["bulgary", "Business Package"],
    "machinery": ["Machinery Breakdown", "Industry_All_risk"],
    "machinery_breakdown": ["Machinery Breakdown", "Industry_All_risk"],
    "liability": ["Liability", "Business Package"],
    "marine": ["marine", "Industry_All_risk"],
    "employee": ["Employee Related"],
    "health": ["Employee Related"],
    "accident": ["Employee Related", "Liability"],
}


def detect_section_type(query: str) -> str | None:
    lower = query.lower()
    for keyword, section_type in SECTION_KEYWORDS.items():
        if keyword in lower:
            return section_type
    return None


def get_categories_for_risk(risk_name: str) -> list[str]:
    lower = risk_name.lower().strip()
    for key, cats in RISK_TO_CATEGORIES.items():
        if key in lower or lower in key:
            return cats
    return []


def _format_vector(embedding: list[float]) -> str:
    return "[" + ",".join(str(v) for v in embedding) + "]"


def _normalize_query_text(query: str) -> str:
    cleaned = " ".join((query or "").split())
    if not cleaned:
        return "%"
    return f"%{'%'.join(cleaned.split())}%"


def classify_query_intent(query: str) -> str | None:
    """Classify only to improve ranking; it never excludes policy evidence."""
    lower = query.lower()
    intents = {
        "waiting_period": ("waiting period",), "co_payment": ("co-pay", "copay", "co payment"),
        "deductible": ("deductible", "excess"), "claim_procedure": ("claim", "intimate", "notification"),
        "renewal": ("renew",), "cancellation": ("cancel", "terminate"),
        "exclusion": ("exclude", "not covered", "exclusion"), "definition": ("define", "meaning", "what is"),
        "coverage": ("cover", "covered", "benefit"), "limits": ("limit", "sum insured", "maximum"),
    }
    return next((name for name, words in intents.items() if any(word in lower for word in words)), None)


def expand_query(query: str) -> str:
    lower = query.lower()
    additions = [value for term, value in QUERY_EXPANSIONS.items() if term in lower]
    return f"{query} {' '.join(additions)}".strip()


async def retrieve_chunks(
    db: AsyncSession,
    query: str,
    insurance_categories: list[str] | None = None,
    top_k: int = 5,
    section_type: str | None = None,
    policy_ids: list[str | UUID] | None = None,
    use_detected_section_type: bool = True,
) -> list[dict]:
    # A caller can explicitly disable section inference when a document does
    # not have section metadata.  This is important for older/OCR'd documents
    # whose chunks are classified as "other".
    final_section_type = section_type
    if final_section_type is None and use_detected_section_type:
        final_section_type = detect_section_type(query)
    
    query_embedding = None
    try:
        query_embedding = await asyncio.to_thread(generate_embedding, query)
    except Exception as exc:
        from app.core.logging import get_logger
        get_logger(__name__).warning("Embedding generation failed in retrieve_chunks: %s", exc)

    conditions = []
    # Keep retriever recall separate from the small final context sent to the LLM.
    candidate_limit = min(max(top_k * 4, 20), 30)
    params = {"limit": candidate_limit, "query": query}
    if query_embedding:
        params["query_vector"] = _format_vector(query_embedding)

    if insurance_categories:
        conditions.append(
            f"document_metadata->>'insurance_category' = ANY(:categories)"
        )
        params["categories"] = insurance_categories

    # An explicit caller filter is authoritative. Inferred intent is a ranking
    # hint only: a hard filter silently misses policies with imperfect metadata.
    if section_type:
        conditions.append(
            f"LOWER(document_metadata->>'section_type') = LOWER(:section_type)"
        )
        params["section_type"] = final_section_type

    has_policy_filter = bool(policy_ids)
    if has_policy_filter:
        conditions.append("policy_id::text = ANY(:policy_ids)")
        params["policy_ids"] = [str(policy_id) for policy_id in policy_ids]

    where_clause = " AND ".join(f"({c})" for c in conditions) if conditions else "TRUE"

    vector_rows = []
    if query_embedding:
        vector_sql = text(f"""
            SELECT
                id, chunk_text, policy_id, document_id,
                chunk_index, page_number, document_metadata,
                1 - (embedding <=> CAST(:query_vector AS vector)) AS similarity
            FROM document_chunks
            WHERE {where_clause} AND embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:query_vector AS vector)
            LIMIT :limit
        """)
        try:
            vector_rows = (await db.execute(vector_sql, params)).fetchall()
        except Exception as exc:
            try:
                await db.rollback()
            except Exception:
                pass
            from app.core.logging import get_logger
            get_logger(__name__).warning("Vector search query failed: %s", exc)

    keyword_where = " AND ".join(f"({c})" for c in conditions) if conditions else "TRUE"
    keyword_rows = []
    keyword_sql = text(f"""
            SELECT
                id, chunk_text, policy_id, document_id,
                chunk_index, page_number, document_metadata,
                ts_rank_cd(to_tsvector('english', coalesce(chunk_text, '')), websearch_to_tsquery('english', :query)) AS similarity
            FROM document_chunks
            WHERE {keyword_where}
              AND to_tsvector('english', coalesce(chunk_text, '')) @@ websearch_to_tsquery('english', :query)
            ORDER BY similarity DESC
            LIMIT :limit
        """)
    try:
        keyword_rows = (await db.execute(keyword_sql, params)).fetchall()
    except Exception as exc:
        try:
            await db.rollback()
        except Exception:
            pass
        from app.core.logging import get_logger
        get_logger(__name__).warning("Keyword search query failed: %s", exc)

    if not keyword_rows:
        plain_keyword_sql = text(f"""
            SELECT
                id, chunk_text, policy_id, document_id,
                chunk_index, page_number, document_metadata,
                ts_rank_cd(to_tsvector('english', coalesce(chunk_text, '')), plainto_tsquery('english', :query)) AS similarity
            FROM document_chunks
            WHERE {keyword_where}
              AND to_tsvector('english', coalesce(chunk_text, '')) @@ plainto_tsquery('english', :query)
            ORDER BY similarity DESC
            LIMIT :limit
        """)
        try:
            keyword_rows = (await db.execute(plain_keyword_sql, params)).fetchall()
        except Exception as exc:
            try:
                await db.rollback()
            except Exception:
                pass
            from app.core.logging import get_logger
            get_logger(__name__).warning("Plain keyword search query failed: %s", exc)

    # Reciprocal-rank fusion combines semantic and exact-keyword evidence.
    fused: dict[str, dict] = {}
    for rank, row in enumerate(vector_rows, 1):
        fused[str(row.id)] = {"row": row, "score": 1 / (60 + rank)}
    for rank, row in enumerate(keyword_rows, 1):
        item = fused.setdefault(str(row.id), {"row": row, "score": 0.0})
        item["score"] += 1 / (60 + rank)
    ranked = sorted(fused.values(), key=lambda item: item["score"], reverse=True)
    # Weak lexical retrieval gets a second, broader hybrid pass using domain
    # aliases. It cannot return arbitrary document chunks.
    if len(ranked) < 3 and expand_query(query) != query:
        try:
            expansion_params = {**params, "query": expand_query(query)}
            expanded_rows = (await db.execute(keyword_sql, expansion_params)).fetchall()
            known = {str(item["row"].id) for item in ranked}
            for rank, row in enumerate(expanded_rows, 1):
                if str(row.id) not in known:
                    ranked.append({"row": row, "score": 1 / (80 + rank)})
        except Exception as exc:
            get_logger(__name__).warning("Expanded keyword search failed: %s", exc)
    ranked = await asyncio.to_thread(_rerank, query, ranked[:candidate_limit])
    rows = [item["row"] for item in ranked[:top_k]]

    return [
        {
            "chunk_id": str(row.id),
            "text": row.chunk_text,
            "policy_id": str(row.policy_id),
            "document_id": str(row.document_id),
            "similarity": float(getattr(row, "similarity", 0.5)),
            "page_number": row.page_number,
            "metadata": row.document_metadata or {},
            "intent": classify_query_intent(query),
        }
        for row in rows
    ]


async def add_neighbor_context(
    db: AsyncSession, chunks: list[dict], max_extra: int = 3
) -> list[dict]:
    """Add adjacent chunks from the same retrieved section, never whole PDFs."""
    if not chunks or max_extra <= 0:
        return chunks
    result = list(chunks)
    seen = {chunk["chunk_id"] for chunk in result}
    for chunk in chunks:
        if len(result) >= len(chunks) + max_extra:
            break
        metadata = chunk.get("metadata") or {}
        section_name = metadata.get("section_name")
        if not section_name:
            continue
        sql = text("""
            SELECT id, chunk_text, policy_id, document_id, chunk_index, page_number, document_metadata
            FROM document_chunks
            WHERE document_id::text = :document_id
              AND document_metadata->>'section_name' = :section_name
              AND chunk_index BETWEEN :start_index AND :end_index
            ORDER BY chunk_index
        """)
        try:
            rows = (await db.execute(sql, {
                "document_id": chunk["document_id"], "section_name": section_name,
                "start_index": max(1, int(metadata.get("chunk_index", 1)) - 1),
                "end_index": int(metadata.get("chunk_index", 1)) + 1,
            })).fetchall()
        except Exception as exc:
            get_logger(__name__).warning("Neighbor context lookup failed: %s", exc)
            continue
        for row in rows:
            if str(row.id) in seen:
                continue
            seen.add(str(row.id))
            result.append({
                "chunk_id": str(row.id), "text": row.chunk_text,
                "policy_id": str(row.policy_id), "document_id": str(row.document_id),
                "similarity": 0.0, "page_number": row.page_number,
                "metadata": row.document_metadata or {}, "is_neighbor": True,
            })
            if len(result) >= len(chunks) + max_extra:
                break
    return result


def _rerank(query: str, candidates: list[dict]) -> list[dict]:
    """Use a cross encoder when available; retain RRF order if the model is unavailable."""
    global _reranker
    if not candidates:
        return candidates
    try:
        if _reranker is None:
            from sentence_transformers import CrossEncoder
            _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        scores = _reranker.predict([(query, item["row"].chunk_text) for item in candidates])
        for item, score in zip(candidates, scores):
            item["score"] = float(score)
        return sorted(candidates, key=lambda item: item["score"], reverse=True)
    except Exception:
        return candidates
