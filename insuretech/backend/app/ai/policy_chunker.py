import json
import uuid
from pathlib import Path

OUTPUT_BASE_DIR = Path(__file__).resolve().parents[2] / "output"
SECTION_DIR = OUTPUT_BASE_DIR / "section_output"
CHUNK_DIR = OUTPUT_BASE_DIR / "chunk_output"

TOKEN_THRESHOLD = 800


def chunk_section(section: dict, doc_info: dict) -> list[dict]:
    heading = section["heading"]
    section_type = section["type"]
    content = section.get("content", "").strip()

    if not content:
        return []

    tokens = content.split()
    token_count = len(tokens)

    if token_count <= TOKEN_THRESHOLD:
        return [{
            "chunk_id": str(uuid.uuid4()),
            "document_id": doc_info["document_id"],
            "policy_name": doc_info["policy_name"],
            "insurer": doc_info["insurer_name"],
            "insurance_category": doc_info["insurance_category"],
            "section_name": heading,
            "section_type": section_type,
            "chunk_index": 1,
            "total_chunks": 1,
            "text": content,
        }]

    paragraphs = content.split("\n\n")
    chunks = []
    current_parts = []
    current_length = 0
    part_index = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        para_tokens = len(para.split())

        if current_length + para_tokens > TOKEN_THRESHOLD and current_parts:
            chunk_text = "\n\n".join(current_parts)
            part_index += 1
            chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "document_id": doc_info["document_id"],
                "policy_name": doc_info["policy_name"],
                "insurer": doc_info["insurer_name"],
                "insurance_category": doc_info["insurance_category"],
                "section_name": heading,
                "section_type": section_type,
                "chunk_index": part_index,
                "total_chunks": 0,
                "text": chunk_text,
            })
            current_parts = []
            current_length = 0

        current_parts.append(para)
        current_length += para_tokens

    if current_parts:
        chunk_text = "\n\n".join(current_parts)
        part_index += 1
        chunks.append({
            "chunk_id": str(uuid.uuid4()),
            "document_id": doc_info["document_id"],
            "policy_name": doc_info["policy_name"],
            "insurer": doc_info["insurer_name"],
            "insurance_category": doc_info["insurance_category"],
            "section_name": heading,
            "section_type": section_type,
            "chunk_index": part_index,
            "total_chunks": 0,
            "text": chunk_text,
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
