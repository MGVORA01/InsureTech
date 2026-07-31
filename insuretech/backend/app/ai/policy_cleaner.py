import json
import re
from pathlib import Path
from html import unescape

OUTPUT_BASE_DIR = Path(__file__).resolve().parents[2] / "output"
INPUT_DIR = OUTPUT_BASE_DIR / "parsed_output"
OUTPUT_DIR = OUTPUT_BASE_DIR / "cleaned_output"

FOOTER_PATTERNS = [
    r"Registered\s*Office",
    r"Corporate\s*Office",
    r"Mailing\s*Address",
    r"Customer\s*Service\s*Address",
    r"Toll\s*Free",
    r"^Website\s*:\s*",
    r"^Email\s*:\s*",
    r"^Telephone\s*:",
    r"^Facsimile\s*:",
    r"^Fax\s*:",
    r"^Tel\s*:",
    r"^Phone\s*:",
    r"IRDA[I]?\s*(Reg|Registration)",

]

ADMIN_KEYWORDS = [
    "insurance ombudsman",
    "grievance redressal",
    "office of the insurance ombudsman",
    "office of the governing body of insurance council",
    "bimalokpal",
]

SECTION_TRANSITIONS = [
    r"^#\s+",
    r"^##\s+",
]


def fix_html_entities(text: str) -> str:
    text = unescape(text)
    text = re.sub(r"</h\d+>", "", text)
    return text


def is_footer_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if re.match(r"^\d+$", stripped) and len(stripped) <= 3:
        return True
    for pattern in FOOTER_PATTERNS:
        if re.search(pattern, stripped, re.IGNORECASE):
            return True
    if re.match(r"^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(Limited|Ltd|Insurance)", stripped):
        if any(kw in stripped.lower() for kw in ["office", "address", "branch"]):
            return True
    return False


def is_admin_page(text: str) -> bool:
    lower = text.lower()
    hits = sum(1 for kw in ADMIN_KEYWORDS if kw in lower)
    return hits >= 3


def clean_page_text(text: str) -> str:
    text = fix_html_entities(text)

    lines = text.splitlines()
    cleaned_lines = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append("")
            continue
        if is_footer_line(stripped):
            continue
        cleaned_lines.append(stripped)

    text = "\n".join(cleaned_lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()
    return text


def process_file(json_path: Path):
    with open(json_path, "r", encoding="utf-8") as f:
        doc = json.load(f)

    if not doc.get("pages"):
        print(f"  ✗ Skipped (no pages): {json_path.name}")
        return

    cleaned_pages = []
    removed_pages = []

    for page in doc["pages"]:
        page_number = page["page_number"]
        content = page.get("content", "")

        if is_admin_page(content):
            removed_pages.append(page_number)
            continue

        cleaned_content = clean_page_text(content)

        if not cleaned_content.strip():
            removed_pages.append(page_number)
            continue

        cleaned_pages.append({
            "page_number": page_number,
            "content": cleaned_content,
        })

    cleaned_text = "\n\n".join(p["content"] for p in cleaned_pages)

    output = {
        "source_file": doc.get("source_file", ""),
        "document_id": doc.get("document_id", ""),
        "insurance_category": doc.get("insurance_category", ""),
        "page_count": len(cleaned_pages),
        "cleaned_text_length": len(cleaned_text),
        "removed_pages": removed_pages,
        "raw_text_length": doc.get("raw_text_length", len(doc.get("raw_text", ""))),
        "cleaned_text": cleaned_text,
        "pages": cleaned_pages,
    }

    rel_path = json_path.relative_to(INPUT_DIR)
    out_dir = OUTPUT_DIR / rel_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    output_file = out_dir / f"{doc['document_id']}.json"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"  ✓ {doc['document_id']} ({len(cleaned_pages)} pages, {len(removed_pages)} removed)")


def main():
    files = sorted(INPUT_DIR.glob("*/*.json"))
    print(f"\nFound {len(files)} parsed files\n")

    for file in files:
        try:
            process_file(file)
        except Exception as e:
            print(f"  ✗ Failed: {file.name} — {e}")

    print("\nCleaning complete.\n")


if __name__ == "__main__":
    main()
