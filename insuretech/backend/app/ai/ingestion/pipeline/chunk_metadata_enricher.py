import json
import re
from pathlib import Path

CHUNK_DIR = Path(__file__).resolve().parents[2] / "output" / "chunk_output"
KEYWORDS = ("exclusion", "covered", "claim", "deductible", "sum insured", "condition", "premium")


def enrich_chunks() -> None:
    """Add searchable labels and a stable source reference to every chunk."""
    for path in sorted(CHUNK_DIR.rglob("*.json")):
        with path.open(encoding="utf-8") as handle:
            document = json.load(handle)
        for chunk in document.get("chunks", []):
            lower = chunk["text"].lower()
            chunk["tags"] = [word for word in KEYWORDS if word in lower]
            chunk["source_file"] = document.get("source_file", "")
            chunk["token_count"] = len(re.findall(r"\S+", chunk["text"]))
        with path.open("w", encoding="utf-8") as handle:
            json.dump(document, handle, ensure_ascii=False, indent=2)
    print("  • Enriched chunks with tags and source metadata")
