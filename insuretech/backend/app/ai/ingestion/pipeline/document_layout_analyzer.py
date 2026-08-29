import json
import re
from pathlib import Path

OUTPUT_BASE_DIR = Path(__file__).resolve().parents[2] / "output"
INPUT_DIR = OUTPUT_BASE_DIR / "parsed_output"
OUTPUT_DIR = OUTPUT_BASE_DIR / "layout_output"


def detect_layout() -> None:
    """Persist lightweight layout signals without losing the parsed source text."""
    processed_documents = 0
    skipped_files = 0
    for path in sorted(INPUT_DIR.rglob("*.json")):
        with path.open(encoding="utf-8") as handle:
            document = json.load(handle)

        # parsed_output also contains extraction_summary.json, whose top-level
        # value is a list rather than a parsed policy document.  Only policy
        # document objects have pages to annotate.
        if not isinstance(document, dict):
            skipped_files += 1
            continue

        pages = document.get("pages", [])
        if not isinstance(pages, list):
            skipped_files += 1
            continue

        for page in pages:
            if not isinstance(page, dict):
                continue
            lines = page.get("content", "").splitlines()
            page["layout"] = {
                "has_table": any("|" in line or "\t" in line for line in lines),
                "heading_count": sum(bool(re.match(r"^#{1,6}\s+|^\d+(?:\.\d+)*\s+[A-Z]", line.strip())) for line in lines),
                "column_suspected": sum(len(line) > 100 for line in lines) > max(3, len(lines) // 3),
            }
        output = OUTPUT_DIR / path.relative_to(INPUT_DIR)
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open("w", encoding="utf-8") as handle:
            json.dump(document, handle, ensure_ascii=False, indent=2)
        processed_documents += 1

    print(f"  • Layout signals written for {processed_documents} documents")
    if skipped_files:
        print(f"  • Skipped {skipped_files} non-document JSON file(s)")
