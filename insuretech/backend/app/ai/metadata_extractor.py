import json
import re
from pathlib import Path
from collections import Counter

CLEANED_DIR = Path(__file__).resolve().parents[2] / "cleaned_output"
METADATA_DIR = Path(__file__).resolve().parents[2] / "metadata_output"

KNOWN_INSURER_NAMES = [
    "SBI General Insurance Company Limited",
    "ICICI Lombard General Insurance Company Limited",
    "ICICI Lombard",
    "HDFC ERGO General Insurance Company Limited",
    "RAHEJA QBE GENERAL INSURANCE COMPANY LIMITED",
    "Raheja QBE General Insurance Company Limited",
    "THE NEW INDIA ASSURANCE COMPANY LIMITED",
    "The New India Assurance Co. Ltd.",
    "NATIONAL INSURANCE COMPANY LIMITED",
    "UNITED INDIA INSURANCE COMPANY LIMITED",
    "Universal Sompo General Insurance Company Limited",
    "Universal Sompo",
    "Liberty General Insurance",
    "Liberty General Insurance Company Limited",
    "GENERALI",
    "IFFCO-TOKIO",
    "IFFCO TOKIO General Insurance Company Limited",
    "Tata AIG General Insurance Company Limited",
    "TATA AIG General Insurance Company Limited",
    "TATA AIG",
    "Bajaj Allianz General Insurance Company Limited",
    "Bajaj General Insurance Company Limited",
    "Future Generali India Insurance Company Limited",
    "Future Generali",
    "Cholamandalam MS General Insurance Company Limited",
    "Reliance General Insurance Company Limited",
    "Royal Sundaram General Insurance Company Limited",
    "Shriram General Insurance Company Limited",
    "Kotak Mahindra General Insurance Company Limited",
    "Aditya Birla Health Insurance Company Limited",
    "ManipalCigna Health Insurance Company Limited",
    "Niva Bupa Health Insurance Company Limited",
    "Star Health and Allied Insurance Company Limited",
    "Liberty Videocon General Insurance Company Limited",
]

UIN_PATTERN = re.compile(r"UIN\s*[:\-]?\s*([A-Z0-9]+)", re.IGNORECASE)
IRDAN_PATTERN = re.compile(r"IRDAN\d+[A-Z0-9]*", re.IGNORECASE)


def normalize_insurer_name(name: str) -> str:
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
    for name in KNOWN_INSURER_NAMES:
        if name.lower() in lower or lower in name.lower():
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
    normalized = normalize_insurer_name(most_common_line)

    if not is_likely_insurer_header(normalized):
        for line, c in counter.most_common(5):
            nl = normalize_insurer_name(line)
            if is_likely_insurer_header(nl):
                normalized = nl
                break

    exact_matches = [n for n in KNOWN_INSURER_NAMES if n.lower() == normalized.lower()]
    if exact_matches:
        return exact_matches[0]

    partial_matches = [n for n in KNOWN_INSURER_NAMES if n.lower() in normalized.lower() or normalized.lower() in n.lower()]
    if partial_matches:
        return partial_matches[0]

    if "insurance" in normalized.lower() and ("limited" in normalized.lower() or "ltd" in normalized.lower()):
        return normalized

    for known in KNOWN_INSURER_NAMES:
        search_key = known.lower().replace(" ", "").replace(".", "")
        line_key = normalized.lower().replace(" ", "").replace(".", "")
        if search_key in line_key or line_key in search_key:
            return known

    if is_likely_insurer_header(normalized):
        return normalized

    return None


def find_insurer_in_text(text: str) -> str | None:
    lower = text.lower()

    for name in sorted(KNOWN_INSURER_NAMES, key=len, reverse=True):
        search_name = name.lower()
        if search_name in lower:
            return name

    match = re.search(r"IRDAI\s+Reg\s*[No.]*\s*:\s*\d+[^.]*", text, re.IGNORECASE)
    if match:
        context = text[max(0, match.start() - 150): match.end() + 300]
        for name in sorted(KNOWN_INSURER_NAMES, key=len, reverse=True):
            if name.lower() in context.lower():
                return name

    match = re.search(r"(?:^|\n)([A-Z][A-Za-z .]+(?:Insurance|Assurance)\s+(?:Company|Co\.?)\s*(?:Limited|Ltd\.?))", text, re.MULTILINE)
    if match:
        return match.group(1).strip()

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
