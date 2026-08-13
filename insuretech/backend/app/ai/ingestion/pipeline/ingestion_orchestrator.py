from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from app.ai.ingestion.pipeline.policy_document_parser import process_all_policies
from app.ai.ingestion.pipeline.policy_text_cleaner import main as clean_main
from app.ai.ingestion.pipeline.policy_metadata_extractor import main as metadata_main
from app.ai.ingestion.pipeline.policy_section_detector import main as section_main
from app.ai.ingestion.pipeline.clause_aware_chunker import main as chunk_main
from app.ai.ingestion.pipeline.pgvector_document_indexer import main as pgvector_main
from app.ai.ingestion.pipeline.document_classifier import classify_documents
from app.ai.ingestion.pipeline.policy_clause_detector import detect_clauses
from app.ai.ingestion.pipeline.policy_definition_extractor import extract_definitions
from app.ai.ingestion.pipeline.document_layout_analyzer import detect_layout
from app.ai.ingestion.pipeline.chunk_metadata_enricher import enrich_chunks
from app.ai.ingestion.pipeline.chunk_quality_validator import validate_chunks
from app.ai.ingestion.pipeline.duplicate_chunk_detector import detect_duplicates
from app.ai.ingestion.pipeline.policy_attribute_extractor import extract_structured_attributes


def run_full_pipeline(data_dir: Path, skip_extract: bool = False) -> None:
    """Run the full ingestion pipeline with staged processing steps."""
    print("=" * 60)
    print("Stage 1: Document Classification")
    print("=" * 60)
    classify_documents(data_dir)

    if not skip_extract:
        print("\n" + "=" * 60)
        print("Stage 2: Digital PDF? / PDF Extraction")
        print("=" * 60)
        process_all_policies(data_dir=data_dir)
    else:
        print("Skipping Stage 2: PDF extraction")

    print("\n" + "=" * 60)
    print("Stage 3: Layout Detection")
    print("=" * 60)
    detect_layout()

    print("\n" + "=" * 60)
    print("Stage 4: Cleaning")
    print("=" * 60)
    clean_main()

    print("\n" + "=" * 60)
    print("Stage 5: Metadata Extraction")
    print("=" * 60)
    metadata_main()

    print("\n" + "=" * 60)
    print("Stage 6: Section Detection")
    print("=" * 60)
    section_main()

    print("\n" + "=" * 60)
    print("Stage 7: Clause Detection")
    print("=" * 60)
    detect_clauses()

    print("\n" + "=" * 60)
    print("Stage 8: Definition Extraction")
    print("=" * 60)
    extract_definitions()

    print("\n" + "=" * 60)
    print("Stage 9: Clause-Aware + Recursive Token Chunking")
    print("=" * 60)
    chunk_main()

    print("\n" + "=" * 60)
    print("Stage 10: Chunk Validation")
    print("=" * 60)
    validate_chunks()

    print("\n" + "=" * 60)
    print("Stage 11: Chunk Enrichment")
    print("=" * 60)
    enrich_chunks()

    print("\n" + "=" * 60)
    print("Stage 12: Structured Attribute Extraction")
    print("=" * 60)
    extract_structured_attributes()

    print("\n" + "=" * 60)
    print("Stage 13: Duplicate Detection")
    print("=" * 60)
    detect_duplicates()

    print("\n" + "=" * 60)
    print("Stage 14: Embedding + PostgreSQL + pgvector")
    print("=" * 60)
    asyncio.run(pgvector_main())

    print("\n" + "=" * 60)
    print("Pipeline complete.")
    print("=" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the full document ingestion pipeline")
    parser.add_argument("--skip-extract", action="store_true", help="Skip PDF extraction")
    parser.add_argument("--data-dir", type=Path, required=True, help="Folder containing PDF files")
    args = parser.parse_args()
    run_full_pipeline(data_dir=args.data_dir, skip_extract=args.skip_extract)


if __name__ == "__main__":
    main()
