import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from app.modules.policy_comparison.service import ComparisonService
from app.modules.policy_comparison.schemas import (
    CompareResponse,
    CoverageGapAnalysis,
    ComparisonItem,
    BusinessRiskItem,
)
from app.modules.policy_comparison.constants import (
    INFO_NOT_AVAILABLE_MESSAGE,
    NO_WINNER_MESSAGE,
    NOT_SPECIFICALLY_ADDRESSED_MESSAGE,
    REQUIRED_COMPARISON_CATEGORIES,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_section_chunks(
    a_texts: dict[str, str | None] | None = None,
    b_texts: dict[str, str | None] | None = None,
) -> dict[str, dict[str, list[dict]]]:
    """Build a section_chunks dict suitable for ComparisonService methods."""
    a_texts = a_texts or {}
    b_texts = b_texts or {}
    chunks: dict[str, dict[str, list[dict]]] = {}
    for cat in REQUIRED_COMPARISON_CATEGORIES:
        a_text = a_texts.get(cat)
        b_text = b_texts.get(cat)
        chunks[cat] = {
            "A": [{"text": a_text, "metadata": {"section_name": cat}}] if a_text else [],
            "B": [{"text": b_text, "metadata": {"section_name": cat}}] if b_text else [],
        }
    return chunks


def _minimal_compare_response(**overrides) -> dict:
    """Return a minimal valid CompareResponse dict with optional overrides."""
    base = {
        "executive_summary": [
            "Both policies provide basic cover.",
            "Policy A has clearer claims wording.",
        ],
        "comparisons": [
            {
                "category": c,
                "policy_a_value": [INFO_NOT_AVAILABLE_MESSAGE],
                "policy_b_value": [INFO_NOT_AVAILABLE_MESSAGE],
                "stronger": "insufficient_evidence",
                "evidence": INFO_NOT_AVAILABLE_MESSAGE,
                "confidence": "low",
            }
            for c in REQUIRED_COMPARISON_CATEGORIES
        ],
        "coverage_gap_analysis": {
            "covered_by_both": [INFO_NOT_AVAILABLE_MESSAGE],
            "covered_only_by_a": [INFO_NOT_AVAILABLE_MESSAGE],
            "covered_only_by_b": [INFO_NOT_AVAILABLE_MESSAGE],
            "covered_by_neither": [INFO_NOT_AVAILABLE_MESSAGE],
        },
        "business_risk_alignment": [],
        "advantages_a": [INFO_NOT_AVAILABLE_MESSAGE],
        "advantages_b": [INFO_NOT_AVAILABLE_MESSAGE],
        "limitations_a": [INFO_NOT_AVAILABLE_MESSAGE],
        "limitations_b": [INFO_NOT_AVAILABLE_MESSAGE],
        "overall_recommendation": [
            "Insufficient evidence for an overall winner.",
            INFO_NOT_AVAILABLE_MESSAGE,
        ],
        "missing_information": ["Claims Process: Policy A"],
        "overall_confidence": "low",
    }
    base.update(overrides)
    return base


# ===========================================================================
# 1. Normal comparison with valid arrays and 5 categories
# ===========================================================================

@pytest.mark.asyncio
async def test_chunks_to_compare_response():
    service = ComparisonService()
    section_chunks = _make_section_chunks(
        a_texts={
            "What is Covered": "Fire and storm damage covered.",
            "Coverage": "Coverage applies during the policy period.",
            "Exclusions": "Wear and tear excluded.",
            "Claims Process": "Notice shall be given to the company.",
            "Conditions": "The insured must maintain records.",
        },
        b_texts={
            "What is Covered": "Property and machinery damage covered.",
            "Coverage": "Coverage applies during the policy period.",
            "Exclusions": "Intentional damage excluded.",
            "Conditions": "The insured must maintain records.",
        },
    )

    res = service._chunks_to_compare_response("Industrial All Risk", "Business Guard Package", section_chunks)
    assert res is not None
    assert len(res.executive_summary) == 2
    assert len(res.comparisons) == 5
    assert all(isinstance(row.policy_a_value, list) for row in res.comparisons)
    assert all(isinstance(row.policy_b_value, list) for row in res.comparisons)
    # CoverageGapAnalysis should support both attribute and subscript access
    assert isinstance(res.coverage_gap_analysis.covered_by_both, list)
    assert isinstance(res.coverage_gap_analysis["covered_by_both"], list)
    assert isinstance(res.overall_recommendation, list)


# ===========================================================================
# 2. Insufficient evidence handling
# ===========================================================================

def test_insufficient_evidence_returns_unavailable():
    service = ComparisonService()
    section_chunks = _make_section_chunks()  # All empty
    res = service._chunks_to_compare_response("Policy X", "Policy Y", section_chunks)
    for item in res.comparisons:
        assert item.policy_a_value == [INFO_NOT_AVAILABLE_MESSAGE]
        assert item.policy_b_value == [INFO_NOT_AVAILABLE_MESSAGE]
        assert item.stronger == "insufficient_evidence"


# ===========================================================================
# 3. Numbered policy clauses stripping
# ===========================================================================

def test_clean_single_point_strips_numbering_prefixes():
    clean = ComparisonService._clean_single_point
    assert clean("1) Fire damage is covered") == "Fire damage is covered."
    assert clean("4) i) The insured shall notify the company") == "The insured shall notify the company."
    assert clean("a) Theft is covered for insured stock") == "Theft is covered for insured stock."
    assert clean("(i) Claims must be filed within 30 days") == "Claims must be filed within 30 days."
    assert clean("6) Property damage due to lightning is insured") == "Property damage due to lightning is insured."
    # Ensure normal words starting with lowercase letters aren't incorrectly stripped
    result = clean("Fire damage is covered under this policy")
    assert result.startswith("Fire")


def test_normalize_point_list_filters_noise_and_numbering():
    service = ComparisonService()
    points = service._normalize_point_list(
        [
            "1) Fire damage is covered",
            "SBI General Insurance Company Limited",
            "Tel: +91 123456789",
            "The additional premium referred above shall be deducted from",
            "2. Fire damage is covered.",
            "• Theft is covered for insured stock.",
        ]
    )
    # "Fire damage is covered." should appear (numbering stripped, deduplicated)
    assert any("Fire damage is covered" in p for p in points)
    assert any("Theft is covered" in p for p in points)
    # Noise items should be filtered out
    assert not any("SBI General" in p for p in points)
    assert not any("Tel:" in p for p in points)
    # Incomplete sentence should be filtered out
    assert not any("additional premium" in p for p in points)


# ===========================================================================
# 4. OCR noise, headers, footers, page numbers, contact info cleaning
# ===========================================================================

def test_clean_single_point_removes_ocr_noise():
    clean = ComparisonService._clean_single_point
    assert clean("Page 3 of 10 Fire damage is covered under the policy") == "Fire damage is covered under the policy."
    assert clean("URN: IRDAI/HLT/MISC/234/2021 The policy covers earthquake damage") == "The policy covers earthquake damage."
    assert clean("CIN: L12345MH2000PLC123456 Coverage includes flood damage") == "Coverage includes flood damage."
    assert clean("") == ""
    assert clean("   ") == ""


def test_clean_single_point_removes_contact_info():
    clean = ComparisonService._clean_single_point
    result = clean("Tel: +91 1234567890")
    assert result == ""  # Should be filtered as junk


def test_clean_chunk_text_removes_document_noise():
    clean = ComparisonService._clean_chunk_text
    result = clean("Policy wording: Fire damage is covered. Page 5 of 20")
    assert "Page 5" not in result
    assert "Policy wording:" not in result
    assert "Fire damage" in result


# ===========================================================================
# 5. Incomplete chunks and dangling sentence rejection
# ===========================================================================

def test_incomplete_sentence_detection():
    assert ComparisonService._is_incomplete_sentence("The policy covers...") is True
    assert ComparisonService._is_incomplete_sentence("The insured shall") is True
    assert ComparisonService._is_incomplete_sentence("Fire and") is True
    assert ComparisonService._is_incomplete_sentence("including") is True
    assert ComparisonService._is_incomplete_sentence("Fire damage is covered under this policy.") is False


def test_clean_single_point_rejects_fragments():
    clean = ComparisonService._clean_single_point
    # Trailing ellipsis with dangling word
    assert clean("The policy covers for...") == ""
    # Dangling preposition
    assert clean("Coverage is available for") == ""
    # Too short
    assert clean("Fire.") == ""
    assert clean("Ok") == ""
    # Ellipsis inside text is detected as incomplete
    assert clean("The insured...must report") == ""


# ===========================================================================
# 6. Duplicate chunk and point deduplication
# ===========================================================================

def test_dedupe_points_removes_duplicates():
    service = ComparisonService()
    points = [
        "Fire damage is covered.",
        "Fire damage is covered.",
        "Theft is included in the policy.",
        "Fire damage is covered.",
    ]
    result = service._dedupe_points(points)
    assert result == ["Fire damage is covered.", "Theft is included in the policy."]


def test_normalize_point_list_deduplicates():
    service = ComparisonService()
    points = service._normalize_point_list([
        "The policy covers fire damage.",
        "The policy covers fire damage.",
        "Theft is explicitly covered under this plan.",
    ])
    assert len(points) == 2


# ===========================================================================
# 7. Exclusions appearing as advantages (must be stripped)
# ===========================================================================

def test_normalize_compare_response_removes_exclusions_from_advantages():
    service = ComparisonService()
    response = CompareResponse.model_validate(_minimal_compare_response(
        advantages_a=["This insurance does not cover terrorism."],
        advantages_b=["Covers fire losses."],
        limitations_a=["This insurance does not cover terrorism."],
        limitations_b=["Claim notice is required."],
    ))
    section_chunks = _make_section_chunks()
    normalized = service._normalize_compare_response(response, section_chunks, [])
    # Exclusion statement should be removed from advantages
    assert all(
        "does not cover" not in p.lower()
        for p in normalized.advantages_a
        if p != INFO_NOT_AVAILABLE_MESSAGE
    )


def test_advantages_do_not_contain_exclusion_keywords():
    service = ComparisonService()
    payload = _minimal_compare_response(
        advantages_a=[
            "Coverage for flood damage is included.",
            "Wear and tear is excluded from coverage.",
            "No liability for intentional acts.",
        ],
        advantages_b=[
            "Provides comprehensive fire coverage.",
            "This policy shall not cover war damage.",
        ],
    )
    section_chunks = _make_section_chunks()
    normalized = service._normalize_compare_payload(payload, section_chunks, [])
    parsed = CompareResponse.model_validate(normalized)
    for adv in parsed.advantages_a:
        if adv != INFO_NOT_AVAILABLE_MESSAGE:
            assert "excluded" not in adv.lower()
            assert "no liability" not in adv.lower()
    for adv in parsed.advantages_b:
        if adv != INFO_NOT_AVAILABLE_MESSAGE:
            assert "shall not" not in adv.lower()


# ===========================================================================
# 8. Limited claims-process evidence (no invented forms/inspections/timelines)
# ===========================================================================

def test_claims_process_empty_returns_unavailable():
    service = ComparisonService()
    section_chunks = _make_section_chunks(
        a_texts={"What is Covered": "Fire is covered."},
        b_texts={"What is Covered": "Theft is covered."},
    )
    res = service._chunks_to_compare_response("A", "B", section_chunks)
    claims_item = next(c for c in res.comparisons if c.category == "Claims Process")
    assert claims_item.policy_a_value == [INFO_NOT_AVAILABLE_MESSAGE]
    assert claims_item.policy_b_value == [INFO_NOT_AVAILABLE_MESSAGE]


# ===========================================================================
# 9. Missing business-risk evidence (returns "not specifically addressed")
# ===========================================================================

def test_business_risk_alignment_missing_returns_not_addressed():
    service = ComparisonService()
    section_chunks = _make_section_chunks(
        a_texts={"Coverage": "Fire damage is insured."},
        b_texts={"Coverage": "Theft damage is insured."},
    )

    class FakeRisk:
        def __init__(self, category, score, level):
            self.category = category
            self.score = score
            self.level = level

    risk_scores = [
        FakeRisk("Cyber Risk", 0.9, "High"),
        FakeRisk("Earthquake Risk", 0.7, "Medium"),
        FakeRisk("Marine Transit Risk", 0.5, "Low"),
    ]
    alignment = service._build_risk_alignment_from_context(risk_scores, section_chunks)
    assert len(alignment) == 3
    # Cyber/Earthquake/Marine won't match fire/theft text
    for item in alignment:
        assert item.policy_a == NOT_SPECIFICALLY_ADDRESSED_MESSAGE or "specifically addresses" in item.policy_a


# ===========================================================================
# 10. Insufficient recommendation evidence
# ===========================================================================

def test_recommendation_returns_no_winner_when_all_insufficient():
    service = ComparisonService()
    comparisons = [
        {"category": c, "stronger": "insufficient_evidence"}
        for c in REQUIRED_COMPARISON_CATEGORIES
    ]
    rec = service._build_overall_recommendation(comparisons)
    assert NO_WINNER_MESSAGE in rec[0]


def test_recommendation_returns_winner_when_evidence_supports():
    service = ComparisonService()
    comparisons = [
        {"category": "What is Covered", "stronger": "a"},
        {"category": "Coverage", "stronger": "a"},
        {"category": "Exclusions", "stronger": "b"},
        {"category": "Claims Process", "stronger": "a"},
        {"category": "Conditions", "stronger": "equal"},
    ]
    rec = service._build_overall_recommendation(comparisons)
    assert "Policy A" in rec[0]


# ===========================================================================
# 11. Pydantic validation: exact counts
# ===========================================================================

def test_pydantic_validates_executive_summary_count():
    with pytest.raises(Exception):
        CompareResponse.model_validate(_minimal_compare_response(
            executive_summary=["Only one sentence."],
        ))


def test_pydantic_validates_five_comparison_categories():
    data = _minimal_compare_response()
    data["comparisons"] = data["comparisons"][:3]
    with pytest.raises(Exception):
        CompareResponse.model_validate(data)


def test_pydantic_validates_recommendation_count():
    with pytest.raises(Exception):
        CompareResponse.model_validate(_minimal_compare_response(
            overall_recommendation=["Only one sentence."],
        ))


def test_pydantic_validates_comparison_category_order():
    data = _minimal_compare_response()
    data["comparisons"] = list(reversed(data["comparisons"]))
    with pytest.raises(Exception):
        CompareResponse.model_validate(data)


# ===========================================================================
# Additional: CoverageGapAnalysis subscript access
# ===========================================================================

def test_coverage_gap_analysis_subscript_access():
    cga = CoverageGapAnalysis(
        covered_by_both=["Point A."],
        covered_only_by_a=["Point B."],
        covered_only_by_b=["Point C."],
        covered_by_neither=["Point D."],
    )
    assert cga["covered_by_both"] == ["Point A."]
    assert cga["covered_only_by_a"] == ["Point B."]
    assert cga["covered_only_by_b"] == ["Point C."]
    assert cga["covered_by_neither"] == ["Point D."]


# ===========================================================================
# Additional: Retrieval fallback tests
# ===========================================================================

@pytest.mark.asyncio
async def test_retrieve_section_for_policy_fallback():
    service = ComparisonService()
    mock_db = AsyncMock()

    with patch("app.modules.policy_comparison.service.retrieve_chunks", new_callable=AsyncMock) as mock_retriever:
        mock_retriever.return_value = []

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
async def test_retrieve_section_unclassified_section_type_fallback():
    service = ComparisonService()
    mock_db = AsyncMock()

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


# ===========================================================================
# Additional: Text extraction and legacy string handling
# ===========================================================================

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
    assert points[0] != INFO_NOT_AVAILABLE_MESSAGE


def test_normalize_compare_payload_handles_legacy_strings():
    service = ComparisonService()
    payload = {
        "executive_summary": "1) Both policies include property coverage.\n2) Policy A has clearer exclusions.",
        "comparisons": [
            {
                "category": "What is Covered",
                "policy_a_value": "• Fire damage is covered.\n• Theft is covered.",
                "policy_b_value": "1) Fire damage is covered.",
                "stronger": "a",
                "evidence": "Chunk 1: Fire wording",
                "confidence": "high",
            }
        ],
        "overall_recommendation": "Policy A appears better aligned.",
    }
    section_chunks = _make_section_chunks()
    normalized = service._normalize_compare_payload(payload, section_chunks, [])
    parsed = CompareResponse.model_validate(normalized)
    assert len(parsed.comparisons) == 5
    assert len(parsed.executive_summary) == 2
    assert isinstance(parsed.comparisons[0].policy_a_value, list)


# ===========================================================================
# Additional: Junk fragment detection
# ===========================================================================

def test_is_junk_fragment():
    assert ComparisonService._is_junk_fragment("Page 12") is True
    assert ComparisonService._is_junk_fragment("URN IRDA123456") is True
    assert ComparisonService._is_junk_fragment("www.example.com") is True
    assert ComparisonService._is_junk_fragment("Tel 1234567890") is True
    assert ComparisonService._is_junk_fragment("Fire damage is covered under the policy.") is False
