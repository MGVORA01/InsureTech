import json
import re
from pathlib import Path

BASE = Path(__file__).resolve().parents[2] / "output"
SECTION_DIR = BASE / "section_output"


def extract_definitions() -> None:
    """Extract quoted and ``term means`` definitions into the section artifact."""
    count = 0
    patterns = (
        re.compile(r'["“]([^"”]{2,80})["”]\s+(?:means|shall mean)\s+([^\n.]{3,500})', re.I),
        re.compile(r'\b([A-Z][A-Za-z /-]{2,80})\s+(?:means|shall mean)\s+([^\n.]{3,500})'),
    )
    for path in sorted(SECTION_DIR.rglob("*.json")):
        with path.open(encoding="utf-8") as handle:
            document = json.load(handle)
        definitions = []
        for section in document.get("sections", []):
            if section.get("type") != "definitions":
                continue
            for pattern in patterns:
                for term, meaning in pattern.findall(section.get("content", "")):
                    definitions.append({"term": term.strip(), "meaning": meaning.strip(), "section": section.get("heading", "")})
        document["definitions"] = definitions[:500]
        with path.open("w", encoding="utf-8") as handle:
            json.dump(document, handle, ensure_ascii=False, indent=2)
        count += len(definitions)
    print(f"  • Extracted {count} definitions")
