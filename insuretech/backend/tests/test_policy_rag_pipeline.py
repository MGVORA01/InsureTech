from app.ai.ingestion.pipeline.clause_aware_chunker import chunk_section
from app.ai.ingestion.pipeline.structured_policy import (
    extract_policy_name,
    extract_structured_sections,
)
from app.ai.retrieval.hybrid_policy_retriever import classify_query_intent, expand_query


def test_source_policy_name_uses_first_page_evidence_before_filename():
    pages = [{"page_number": 1, "content": "ACME Health Insurance Policy\nPolicy Schedule"}]
    assert extract_policy_name(pages, "unhelpful.pdf") == "ACME Health Insurance Policy"
    assert extract_policy_name([], "unhelpful.pdf") == "unhelpful.pdf"


def test_structure_and_chunk_context_keep_page_clause_and_subsection():
    pages = [{
        "page_number": 14,
        "content": "1. COVERAGE\n1.1 Hospitalisation\n1.1.1 Room rent is limited to Rs 5,000 per day.",
    }]
    section = extract_structured_sections(pages)[0]
    chunk = chunk_section(section, {
        "document_id": "doc", "policy_name": "ACME Health", "insurer_name": "ACME",
        "insurance_category": "Health",
    })[0]
    assert chunk["page_number"] == 14
    assert chunk["clause_id"] == "1.1.1"
    assert "Policy Name: ACME Health" in chunk["embedding_text"]
    assert "Page: 14" in chunk["embedding_text"]


def test_query_aliases_are_intent_aware_without_overriding_evidence():
    assert classify_query_intent("Is there a co-payment?") == "co_payment"
    assert "excess" in expand_query("What deductible applies?")
