import json
import re
from pathlib import Path
from collections import Counter

from app.ai.insurer_normalizer import CANONICAL_MAP, normalize_insurer_name as canonicalize_insurer

CLEANED_DIR = Path(__file__).resolve().parents[2] / "cleaned_output"
METADATA_DIR = Path(__file__).resolve().parents[2] / "metadata_output"

CANONICAL_VARIANTS = list(CANONICAL_MAP.keys())

UIN_PATTERN = re.compile(r"UIN\s*[:\-]?\s*([A-Z0-9]+)", re.IGNORECASE)
IRDAN_PATTERN = re.compile(r"IRDAN\d+[A-Z0-9]*", re.IGNORECASE)


def clean_insurer_name(name: str) -> str:
    name = name.strip()
    name = re.sub(r"^#\s*", "", name)
    name = re.sub(r"\s{2,}", " ", name)
    name = re.sub(r"\s+SBI$", "", name)
    name = re.sub(r"\s+Nibhaye\s+Vaade$", "", name)
    return name.strip()


INSURER_KEYWORDS = [
    "insurance company limited",
    "insurance co. ltd",
    "general insurance",
    "assurance company",
    "assurance co.",
]

INSURER_FIRST_LINE_BLACKLIST = [
    "policy wordings",
    "policy wording",
    "preamble",
    "operative clause",
    "section",
    "exclusions",
    "definitions",
    "conditions",
    "claims procedure",
    "coverage",
    "general conditions",
    "special exclusions",
]


def is_likely_insurer_header(line: str) -> bool:
    lower = line.lower()
    if any(kw in lower for kw in INSURER_KEYWORDS):
        return True
    for variant in CANONICAL_VARIANTS:
        if variant in lower or lower in variant:
            return True
    return False


def find_insurer_from_first_lines(pages: list) -> str | None:
    first_lines = []
    for p in pages:
        lines = [l.strip() for l in p["content"].split("\n") if l.strip()]
        if lines:
            first_lines.append(lines[0])

    if not first_lines:
        return None

    counter = Counter(first_lines)
    most_common_line, count = counter.most_common(1)[0]
    cleaned = clean_insurer_name(most_common_line)

    if not is_likely_insurer_header(cleaned):
        for line, c in counter.most_common(5):
            nl = clean_insurer_name(line)
            if is_likely_insurer_header(nl):
                cleaned = nl
                break

    result = canonicalize_insurer(cleaned)
    if result and result != cleaned:
        return result

    lower_cleaned = cleaned.lower()
    for variant, canonical in CANONICAL_MAP.items():
        if variant in lower_cleaned or lower_cleaned in variant:
            return canonical

    if "insurance" in cleaned.lower() and ("limited" in cleaned.lower() or "ltd" in cleaned.lower()):
        return cleaned

    for variant, canonical in CANONICAL_MAP.items():
        search_key = variant.replace(" ", "").replace(".", "")
        line_key = lower_cleaned.replace(" ", "").replace(".", "")
        if search_key in line_key or line_key in search_key:
            return canonical

    if is_likely_insurer_header(cleaned):
        return cleaned

    return None


def find_insurer_in_text(text: str) -> str | None:
    lower = text.lower()

    for variant in sorted(CANONICAL_VARIANTS, key=len, reverse=True):
        if variant in lower:
            return CANONICAL_MAP[variant]

    match = re.search(r"IRDAI\s+Reg\s*[No.]*\s*:\s*\d+[^.]*", text, re.IGNORECASE)
    if match:
        context = text[max(0, match.start() - 150): match.end() + 300]
        context_lower = context.lower()
        for variant in sorted(CANONICAL_VARIANTS, key=len, reverse=True):
            if variant in context_lower:
                return CANONICAL_MAP[variant]

    match = re.search(r"(?:^|\n)([A-Z][A-Za-z .]+(?:Insurance|Assurance)\s+(?:Company|Co\.?)\s*(?:Limited|Ltd\.?))", text, re.MULTILINE)
    if match:
        raw = match.group(1).strip()
        return canonicalize_insurer(raw)

    return None


def extract_policy_name(page1_content: str, insurer_name: str | None = None) -> str | None:
    lines = page1_content.split("\n")
    headings = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("#") and len(stripped) > 2:
            heading_text = re.sub(r"^#+\s*", "", stripped).strip()
            headings.append(heading_text)

    if not headings:
        return None

    for h in headings:
        h_lower = h.lower()
        if insurer_name and insurer_name.lower() in h_lower:
            continue
        if h_lower in ["preamble", "policy wording", "operative clause"]:
            continue
        if len(h) > 5:
            return h

    return headings[0] if headings else None


def extract_uin(text: str) -> str | None:
    match = IRDAN_PATTERN.search(text)
    if match:
        return match.group(0)
    match = UIN_PATTERN.search(text)
    if match:
        return match.group(1)
    return None


def process_file(json_path: Path):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    pages = data.get("pages", [])
    if not pages:
        print(f"  ✗ Skipped (no pages): {json_path.name}")
        return

    full_text = data.get("cleaned_text", "")

    insurer_name = find_insurer_from_first_lines(pages)
    if not insurer_name:
        insurer_name = find_insurer_in_text(full_text)

    first_page_text = pages[0]["content"] if pages else ""
    policy_name = extract_policy_name(first_page_text, insurer_name)

    uin = extract_uin(full_text)
    if not uin:
        uin = extract_uin(first_page_text)

    output = {
        "document_id": data.get("document_id", ""),
        "source_file": data.get("source_file", ""),
        "insurance_category": data.get("insurance_category", ""),
        "insurer_name": insurer_name or "",
        "policy_name": policy_name or "",
        "uin": uin or "",
        "page_count": data.get("page_count", 0),
        "cleaned_text_length": data.get("cleaned_text_length", 0),
    }

    rel_path = json_path.relative_to(CLEANED_DIR)
    out_dir = METADATA_DIR / rel_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    output_file = out_dir / f"{data['document_id']}.json"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    status = f"insurer={output['insurer_name'][:30] if output['insurer_name'] else '?'} | policy={output['policy_name'][:40] if output['policy_name'] else '?'}"
    print(f"  ✓ {data['document_id']} — {status}")


def main():
    files = sorted(CLEANED_DIR.rglob("*.json"))
    print(f"\nFound {len(files)} cleaned files\n")

    for file in files:
        try:
            process_file(file)
        except Exception as e:
            print(f"  ✗ Failed: {file.name} — {e}")

    print("\nMetadata extraction complete.\n")


if __name__ == "__main__":
    main()
