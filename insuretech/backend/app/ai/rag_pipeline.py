from sqlalchemy import select, text
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


async def retrieve_chunks(
    db: AsyncSession,
    query: str,
    insurance_categories: list[str] | None = None,
    top_k: int = 5,
    section_type: str | None = None,
) -> list[dict]:
    detected_type = detect_section_type(query)
    final_section_type = section_type or detected_type
    query_embedding = generate_embedding(query)
    vector_literal = _format_vector(query_embedding)

    conditions = []
    params = {"limit": top_k}

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

    where_clause = " AND ".join(f"({c})" for c in conditions) if conditions else "TRUE"

    sql = text(f"""
        SELECT
            id, chunk_text, policy_id, document_id,
            chunk_index, page_number, document_metadata,
            1 - (embedding <=> '{vector_literal}'::vector) AS similarity
        FROM document_chunks
        WHERE {where_clause}
        ORDER BY embedding <=> '{vector_literal}'::vector
        LIMIT :limit
    """)

    result = await db.execute(sql, params)
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
