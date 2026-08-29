import asyncio
import re
from uuid import UUID

from sqlalchemy import bindparam, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocumentChunk
from app.ai.models.bge_embedding_service import generate_embedding

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
    candidate_limit = min(max(top_k * 4, 12), 80)
    params = {"limit": candidate_limit, "query": query}
    if query_embedding:
        params["query_vector"] = _format_vector(query_embedding)

    if insurance_categories:
        conditions.append(
            f"document_metadata->>'insurance_category' = ANY(:categories)"
        )
        params["categories"] = insurance_categories

    if final_section_type:
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

    # Fallback to simple text matching or chunk query if both vector and keyword queries returned no results
    if not vector_rows and not keyword_rows:
        # Relax section_type constraint for fallback query if policy filter is present
        fallback_conditions = [c for c in conditions if "section_type" not in c]
        fallback_where = " AND ".join(f"({c})" for c in fallback_conditions) if fallback_conditions else "TRUE"
        fallback_sql = text(f"""
            SELECT
                id, chunk_text, policy_id, document_id,
                chunk_index, page_number, document_metadata,
                0.5 AS similarity
            FROM document_chunks
            WHERE {fallback_where}
            ORDER BY chunk_index ASC
            LIMIT :limit
        """)
        try:
            vector_rows = (await db.execute(fallback_sql, params)).fetchall()
        except Exception as exc:
            try:
                await db.rollback()
            except Exception:
                pass
            from app.core.logging import get_logger
            get_logger(__name__).warning("Fallback chunk retrieval failed: %s", exc)

    # Reciprocal-rank fusion combines semantic and exact-keyword evidence.
    fused: dict[str, dict] = {}
    for rank, row in enumerate(vector_rows, 1):
        fused[str(row.id)] = {"row": row, "score": 1 / (60 + rank)}
    for rank, row in enumerate(keyword_rows, 1):
        item = fused.setdefault(str(row.id), {"row": row, "score": 0.0})
        item["score"] += 1 / (60 + rank)
    ranked = sorted(fused.values(), key=lambda item: item["score"], reverse=True)
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
            "metadata": row.document_metadata,
        }
        for row in rows
    ]


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
