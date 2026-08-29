import json
import re
from pathlib import Path

CHUNK_DIR = Path(__file__).resolve().parents[2] / "output" / "chunk_output"
MONEY = re.compile(r"(?:₹|Rs\.?|INR)\s?[\d,]+(?:\.\d+)?(?:\s*(?:lakh|lac|crore|million))?", re.I)
PERCENT = re.compile(r"\b\d+(?:\.\d+)?\s*%")


def extract_structured_attributes() -> None:
    """Extract conservative, evidence-backed financial attributes from chunks."""
    for path in sorted(CHUNK_DIR.rglob("*.json")):
        with path.open(encoding="utf-8") as handle:
            document = json.load(handle)
        for chunk in document.get("chunks", []):
            chunk["attributes"] = {"money_amounts": MONEY.findall(chunk["text"]), "percentages": PERCENT.findall(chunk["text"])}
        with path.open("w", encoding="utf-8") as handle:
            json.dump(document, handle, ensure_ascii=False, indent=2)
    print("  • Extracted structured financial attributes")
