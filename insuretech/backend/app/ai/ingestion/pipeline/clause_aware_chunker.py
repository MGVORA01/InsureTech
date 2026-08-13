import json
import uuid
from pathlib import Path

OUTPUT_BASE_DIR = Path(__file__).resolve().parents[2] / "output"
SECTION_DIR = OUTPUT_BASE_DIR / "section_output"
CHUNK_DIR = OUTPUT_BASE_DIR / "chunk_output"

TOKEN_THRESHOLD = 450
TOKEN_OVERLAP = 60


def _token_chunks(text: str) -> list[str]:
    """Recursively split long text while preserving paragraph/sentence boundaries."""
    words = text.split()
    if len(words) <= TOKEN_THRESHOLD:
        return [text.strip()] if text.strip() else []
    units = [part.strip() for part in text.split("\n\n") if part.strip()]
    if len(units) <= 1:
        units = [part.strip() for part in __import__("re").split(r"(?<=[.!?])\s+", text) if part.strip()]
    chunks, current, length = [], [], 0
    for unit in units:
        unit_words = unit.split()
        if len(unit_words) > TOKEN_THRESHOLD:
            if current:
                chunks.append("\n\n".join(current))
                current, length = [], 0
            for start in range(0, len(unit_words), TOKEN_THRESHOLD - TOKEN_OVERLAP):
                chunks.append(" ".join(unit_words[start:start + TOKEN_THRESHOLD]))
            continue
        if current and length + len(unit_words) > TOKEN_THRESHOLD:
            chunks.append("\n\n".join(current))
            overlap = " ".join(chunks[-1].split()[-TOKEN_OVERLAP:])
            current, length = ([overlap] if overlap else []), len(overlap.split())
        current.append(unit)
        length += len(unit_words)
    if current:
        chunks.append("\n\n".join(current))
    return chunks


def chunk_section(section: dict, doc_info: dict) -> list[dict]:
    heading = section["heading"]
    section_type = section["type"]
    content = section.get("content", "").strip()

    if not content:
        return []

    clause_units = section.get("clauses") or [{"clause_id": None, "text": content}]
    chunks = []
    for clause in clause_units:
        for chunk_text in _token_chunks(clause.get("text", "")):
            chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "document_id": doc_info["document_id"], "policy_name": doc_info["policy_name"],
                "insurer": doc_info["insurer_name"], "insurance_category": doc_info["insurance_category"],
                "section_name": heading, "section_type": section_type,
                "clause_id": clause.get("clause_id"), "page_number": section.get("page_number"),
                "chunk_index": len(chunks) + 1, "total_chunks": 0, "text": chunk_text,
            })

    total = len(chunks)
    for c in chunks:
        c["total_chunks"] = total

    return chunks


def process_file(section_path: Path):
    with open(section_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    doc_info = {
        "document_id": data.get("document_id", ""),
        "insurance_category": data.get("insurance_category", ""),
        "insurer_name": data.get("insurer_name", ""),
        "policy_name": data.get("policy_name", ""),
    }

    all_chunks = []
    for section in data.get("sections", []):
        chunks = chunk_section(section, doc_info)
        all_chunks.extend(chunks)

    output = {
        "document_id": doc_info["document_id"],
        "source_file": data.get("source_file", ""),
        "insurance_category": doc_info["insurance_category"],
        "insurer_name": doc_info["insurer_name"],
        "policy_name": doc_info["policy_name"],
        "total_chunks": len(all_chunks),
        "chunks": all_chunks,
    }

    rel_path = section_path.relative_to(SECTION_DIR)
    out_dir = CHUNK_DIR / rel_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    output_file = out_dir / f"{doc_info['document_id']}.json"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"  ✓ {doc_info['document_id']} — {len(all_chunks)} chunks")


def main():
    files = sorted(SECTION_DIR.rglob("*.json"))
    print(f"\nFound {len(files)} section files\n")

    for file in files:
        try:
            process_file(file)
        except Exception as e:
            print(f"  ✗ Failed: {file.name} — {e}")

    print("\nChunking complete.\n")


if __name__ == "__main__":
    main()
