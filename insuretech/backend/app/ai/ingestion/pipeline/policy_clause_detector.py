import json
import re
from pathlib import Path

BASE = Path(__file__).resolve().parents[2] / "output"
SECTION_DIR = BASE / "section_output"
CLAUSE_START = re.compile(r"(?m)^(?=(?:\d+(?:\.\d+)*|[A-Z])(?:[.)])?\s+)")


def detect_clauses() -> None:
    """Split numbered/lettered policy provisions into clause units."""
    total = 0
    for path in sorted(SECTION_DIR.rglob("*.json")):
        with path.open(encoding="utf-8") as handle:
            document = json.load(handle)
        for section in document.get("sections", []):
            parts = [part.strip() for part in CLAUSE_START.split(section.get("content", "")) if part.strip()]
            section["clauses"] = [
                {"clause_id": f"{index + 1}", "text": part}
                for index, part in enumerate(parts)
            ] if len(parts) > 1 else []
            total += len(section["clauses"])
        with path.open("w", encoding="utf-8") as handle:
            json.dump(document, handle, ensure_ascii=False, indent=2)
    print(f"  • Detected {total} clause boundaries")
