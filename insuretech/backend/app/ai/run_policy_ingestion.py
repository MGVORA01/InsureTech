#!/usr/bin/env python3
"""Start the AI policy-ingestion pipeline.

By default it scans `backend/data/` and executes the pipeline end-to-end.

Usage:
    python -m app.ai.run_policy_ingestion
    python app/ai/run_policy_ingestion.py
    python -m app.ai.run_policy_ingestion --data-dir /path/to/pdfs
"""

import argparse
import sys
from pathlib import Path

# Support both ``python -m`` and direct execution from the backend folder.
if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.ai.ingestion.pipeline.ingestion_orchestrator import run_full_pipeline


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the AI ingestion pipeline")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=None,
        help="Path to the directory containing PDFs. Default: backend/data",
    )
    parser.add_argument(
        "--skip-extract",
        action="store_true",
        help="Skip PDF extraction stage",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    backend_root = Path(__file__).resolve().parents[2]
    data_dir = args.data_dir or backend_root / "data"

    if not data_dir.exists() or not data_dir.is_dir():
        raise FileNotFoundError(
            f"Data directory not found: {data_dir.resolve()}"
        )

    print(f"Using data directory: {data_dir.resolve()}")
    run_full_pipeline(data_dir=data_dir, skip_extract=args.skip_extract)


if __name__ == "__main__":
    main()
