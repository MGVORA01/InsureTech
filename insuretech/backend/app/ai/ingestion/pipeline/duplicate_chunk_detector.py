import hashlib
import json
from pathlib import Path

CHUNK_DIR = Path(__file__).resolve().parents[2] / "output" / "chunk_output"


def detect_duplicates() -> None:
    """Remove exact duplicate chunks within the batch before embedding."""
    seen, removed = set(), 0
    for path in sorted(CHUNK_DIR.rglob("*.json")):
        with path.open(encoding="utf-8") as handle:
            document = json.load(handle)
        unique = []
        for chunk in document.get("chunks", []):
            fingerprint = hashlib.sha256(" ".join(chunk["text"].lower().split()).encode()).hexdigest()
            if fingerprint in seen:
                removed += 1
                continue
            seen.add(fingerprint)
            chunk["content_hash"] = fingerprint
            unique.append(chunk)
        for index, chunk in enumerate(unique, 1):
            chunk["chunk_index"], chunk["total_chunks"] = index, len(unique)
        document["chunks"], document["total_chunks"] = unique, len(unique)
        with path.open("w", encoding="utf-8") as handle:
            json.dump(document, handle, ensure_ascii=False, indent=2)
    print(f"  • Removed {removed} duplicate chunks")
