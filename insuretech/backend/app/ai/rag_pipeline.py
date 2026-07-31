import asyncio
import re
from uuid import UUID

from sqlalchemy import bindparam, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocumentChunk
from app.ai.embeddings import generate_embedding

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
) -> list[dict]:
    detected_type = detect_section_type(query)
    final_section_type = section_type or detected_type
    query_embedding = await asyncio.to_thread(generate_embedding, query)

    conditions = []
    params = {"limit": top_k, "query_vector": _format_vector(query_embedding)}

    if insurance_categories:
        conditions.append(
            f"document_metadata->>'insurance_category' = ANY(:categories)"
        )
        params["categories"] = insurance_categories

    if final_section_type:
        conditions.append(
            f"document_metadata->>'section_type' = :section_type"
        )
        params["section_type"] = final_section_type

    has_policy_filter = bool(policy_ids)
    if has_policy_filter:
        conditions.append("policy_id::text IN :policy_ids")
        params["policy_ids"] = [str(policy_id) for policy_id in policy_ids]

    where_clause = " AND ".join(f"({c})" for c in conditions) if conditions else "TRUE"

    sql = text(f"""
        SELECT
            id, chunk_text, policy_id, document_id,
            chunk_index, page_number, document_metadata,
            1 - (embedding <=> :query_vector::vector) AS similarity
        FROM document_chunks
        WHERE {where_clause}
        ORDER BY embedding <=> :query_vector::vector
        LIMIT :limit
    """)
    if has_policy_filter:
        sql = sql.bindparams(bindparam("policy_ids", expanding=True))

    result = await db.execute(sql, params)
    rows = result.fetchall()

    if not rows and query:
        params["query_text"] = _normalize_query_text(query)
        keyword_where = " AND ".join(f"({c})" for c in conditions) if conditions else "TRUE"
        keyword_sql = text(f"""
            SELECT
                id, chunk_text, policy_id, document_id,
                chunk_index, page_number, document_metadata,
                0.0 AS similarity
            FROM document_chunks
            WHERE {keyword_where}
              AND (
                  chunk_text ILIKE :query_text
                  OR document_metadata->>'section_name' ILIKE :query_text
                  OR document_metadata->>'policy_name' ILIKE :query_text
                  OR document_metadata->>'insurance_category' ILIKE :query_text
              )
            ORDER BY policy_id, chunk_index
            LIMIT :limit
        """)
        if has_policy_filter:
            keyword_sql = keyword_sql.bindparams(bindparam("policy_ids", expanding=True))
        result = await db.execute(keyword_sql, params)
        rows = result.fetchall()

    return [
        {
            "chunk_id": str(row.id),
            "text": row.chunk_text,
            "policy_id": str(row.policy_id),
            "document_id": str(row.document_id),
            "similarity": float(row.similarity),
            "metadata": row.document_metadata,
        }
        for row in rows
    ]
