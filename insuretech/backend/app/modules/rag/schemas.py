from uuid import UUID

from pydantic import BaseModel, Field


class RagQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User's insurance query")
    insurance_categories: list[str] | None = Field(
        None, description="Filter by insurance categories. None = search all."
    )
    section_type: str | None = Field(
        None, description="Optional section type filter (e.g., 'exclusions', 'coverage')"
    )
    top_k: int = Field(5, ge=1, le=20, description="Number of top chunks to retrieve")
    policy_ids: list[UUID] | None = Field(
        None, description="Filter by specific policy UUIDs. None = search all."
    )


class ChunkResult(BaseModel):
    text: str
    policy_name: str
    insurer: str
    insurance_category: str
    section_name: str
    section_type: str
    similarity: float


class RagQueryResponse(BaseModel):
    answer: str
    chunks: list[ChunkResult]
    provider: str
