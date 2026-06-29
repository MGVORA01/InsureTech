"""
Ingestion pipeline entry point.

Runs: policy_extractor → policy_cleaner → metadata_extractor
      → section_detector → policy_chunker → pgvector_loader

Usage:
    python run_ingestion.py

Optional (skip PDF parsing if already done):
    python run_ingestion.py --skip-extract
"""

import sys
import argparse


def main():
    parser = argparse.ArgumentParser(description="Run the full document ingestion pipeline")
    parser.add_argument("--skip-extract", action="store_true", help="Skip PDF extraction (stage 1)")
    args = parser.parse_args()

    # Stage 1: PDF Extraction (LlamaParse)
    if not args.skip_extract:
        print("=" * 60)
        print("Stage 1: PDF Extraction")
        print("=" * 60)
        from app.ai.policy_extractor import main as extract
        extract()
    else:
        print("Skipping Stage 1 (PDF extraction)")

    # Stage 2: Clean parsed output
    print("\n" + "=" * 60)
    print("Stage 2: Cleaning")
    print("=" * 60)
    from app.ai.policy_cleaner import main as clean
    clean()

    # Stage 3: Metadata extraction
    print("\n" + "=" * 60)
    print("Stage 3: Metadata Extraction")
    print("=" * 60)
    from app.ai.metadata_extractor import main as extract_meta
    extract_meta()

    # Stage 4: Section detection
    print("\n" + "=" * 60)
    print("Stage 4: Section Detection")
    print("=" * 60)
    from app.ai.section_detector import main as detect_sections
    detect_sections()

    # Stage 5: Chunking
    print("\n" + "=" * 60)
    print("Stage 5: Chunking")
    print("=" * 60)
    from app.ai.policy_chunker import main as chunk
    chunk()

    # Stage 6: Embed + Load to PGVector
    print("\n" + "=" * 60)
    print("Stage 6: Embedding + PGVector Load")
    print("=" * 60)
    import asyncio
    from app.ai.pgvector_loader import main as load
    asyncio.run(load())

    print("\n" + "=" * 60)
    print("Pipeline complete.")
    print("=" * 60)


if __name__ == "__main__":
    main()
