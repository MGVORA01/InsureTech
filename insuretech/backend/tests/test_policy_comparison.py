import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from app.modules.policy_comparison.service import ComparisonService

@pytest.mark.asyncio
async def test_retrieve_section_for_policy_fallback():
    service = ComparisonService()
    mock_db = AsyncMock()

    # Mock retrieve_chunks returning empty
    with patch("app.modules.policy_comparison.service.retrieve_chunks", new_callable=AsyncMock) as mock_retriever:
        mock_retriever.return_value = []

        # Mock direct DB execute returning sample document chunks
        mock_chunk = MagicMock()
        mock_chunk.id = uuid4()
        mock_chunk.policy_id = uuid4()
        mock_chunk.document_id = uuid4()
        mock_chunk.chunk_text = "Coverage includes property damage caused by fire, explosion, and lightning."
        mock_chunk.page_number = 1
        mock_chunk.document_metadata = {"section_type": "coverage", "section_name": "What is Covered"}

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_chunk]
        mock_db.execute.return_value = mock_result

        chunks = await service._retrieve_section_for_policy(
            db=mock_db,
            policy_id=mock_chunk.policy_id,
            query="what is covered",
            section_name="What is Covered",
            section_type="coverage"
        )

        assert len(chunks) == 1
        assert chunks[0]["text"] == mock_chunk.chunk_text
        assert chunks[0]["policy_id"] == str(mock_chunk.policy_id)

@pytest.mark.asyncio
async def test_chunks_to_compare_response():
    service = ComparisonService()
    policy_a_name = "Industrial All Risk"
    policy_b_name = "Business Guard Package"
    
    section_chunks = {
        "What is Covered": {
            "A": [{"text": "Fire and storm damage covered.", "metadata": {"section_name": "What is Covered"}}],
            "B": [{"text": "Property and machinery damage covered.", "metadata": {"section_name": "What is Covered"}}],
        },
        "Exclusions": {
            "A": [{"text": "Wear and tear excluded.", "metadata": {"section_name": "Exclusions"}}],
            "B": [{"text": "Intentional damage excluded.", "metadata": {"section_name": "Exclusions"}}],
        }
    }

    res = service._chunks_to_compare_response(policy_a_name, policy_b_name, section_chunks)
    assert res is not None
    assert "Industrial All Risk" in res.executive_summary
    assert len(res.comparisons) == 2

@pytest.mark.asyncio
async def test_retrieve_section_unclassified_section_type_fallback():
    service = ComparisonService()
    mock_db = AsyncMock()

    # Mock retrieve_chunks returning empty when section_type is passed, but returning chunks when section_type=None
    async def side_effect(db, query, policy_ids, section_type=None, top_k=5, use_detected_section_type=True):
        if section_type is not None:
            return []
        return [{
            "chunk_id": str(uuid4()),
            "text": "The company will pay for direct loss of or damage to property.",
            "policy_id": str(policy_ids[0]),
            "document_id": str(uuid4()),
            "similarity": 0.85,
            "page_number": 1,
            "metadata": {"section_type": "other", "section_name": "Scope of Cover"}
        }]

    with patch("app.modules.policy_comparison.service.retrieve_chunks", side_effect=side_effect):
        chunks = await service._retrieve_section_for_policy(
            db=mock_db,
            policy_id=uuid4(),
            query="what is covered",
            section_name="What is Covered",
            section_type="coverage"
        )
        assert len(chunks) == 1
        assert "direct loss" in chunks[0]["text"]

def test_extract_points_from_text_fallback():
    service = ComparisonService()
    raw_text = "| Item | Limit |\n| Fire Damage | $500,000 |\n| Theft | $100,000 |"
    points = service._extract_points_from_text(raw_text, limit=2)
    assert len(points) > 0
    assert "Information not available" not in points[0]

def test_extract_policy_points_without_matching_terms():
    service = ComparisonService()
    chunks = [{"text": "Special endorsement covering water damage up to limit.", "metadata": {}}]
    points = service._extract_policy_points(chunks, terms=("exclusion", "deductible"))
    assert len(points) > 0
    assert points[0] != "Information not available in the selected policies."

