import json
from pathlib import Path

CHUNK_DIR = Path(__file__).resolve().parents[2] / "output" / "chunk_output"


def validate_chunks() -> None:
    """Remove empty/oversized chunks and re-number each document deterministically."""
    kept = removed = 0
    for path in sorted(CHUNK_DIR.rglob("*.json")):
        with path.open(encoding="utf-8") as handle:
            document = json.load(handle)
        chunks = []
        for chunk in document.get("chunks", []):
            text = " ".join(chunk.get("text", "").split())
            if len(text.split()) < 8 or len(text.split()) > 520:
                removed += 1
                continue
            chunk["text"] = text
            chunks.append(chunk)
        for index, chunk in enumerate(chunks, 1):
            chunk["chunk_index"], chunk["total_chunks"] = index, len(chunks)
        document["chunks"], document["total_chunks"] = chunks, len(chunks)
        with path.open("w", encoding="utf-8") as handle:
            json.dump(document, handle, ensure_ascii=False, indent=2)
        kept += len(chunks)
    print(f"  • Validated {kept} chunks; removed {removed} invalid chunks")
