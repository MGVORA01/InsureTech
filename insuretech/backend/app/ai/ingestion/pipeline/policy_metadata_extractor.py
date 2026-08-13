import json
import re
from pathlib import Path
from collections import Counter

from app.ai.shared.insurer_name_normalizer import CANONICAL_MAP, normalize_insurer_name as canonicalize_insurer

OUTPUT_BASE_DIR = Path(__file__).resolve().parents[2] / "output"
CLEANED_DIR = OUTPUT_BASE_DIR / "cleaned_output"
METADATA_DIR = OUTPUT_BASE_DIR / "metadata_output"

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

    if "l&t general insurance" in lower or "l&t general" in lower or "l&t" in lower and "insurance" in lower:
        return "L&T General Insurance"

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


def _clean_policy_name(candidate: str) -> str:
    candidate = re.sub(r"\(.*?\)", "", candidate)
    candidate = re.sub(
        r"\b(hereinafter|hereafter|the company|the said|the full premium|mentioned in the said|subject to|entitled to|sum insured).*",
        "",
        candidate,
        flags=re.IGNORECASE,
    )
    candidate = re.sub(r"\s+UIN\s*:?.*$", "", candidate, flags=re.IGNORECASE)
    candidate = re.sub(r"\s+IRDAN[A-Z0-9]*.*$", "", candidate, flags=re.IGNORECASE)
    return candidate.strip(" -:|\n\r")


GENERIC_FILENAME_TOKENS = {
    "customer",
    "cumstomer",
    "information",
    "sheet",
    "specific",
    "voyage",
    "retail",
    "product",
    "ver",
    "doc",
    "document",
    "pdf",
    "pw",
    "proposal",
    "prospectus",
}

POLICY_NAME_BLACKLIST = (
    "project documentation",
    "insurance policy",
    "policy wording",
    "policy wordings",
    "terms",
    "unknown",
    "claims made",
    "protect your assets",
    "preamble",
)

CANONICAL_POLICY_MAP = [
    (r"\bmachinery\s+breakdown\b", "Machinery Breakdown Insurance Policy"),
    (r"\berection\s+all\s+risks?\b", "Erection All Risks Insurance Policy"),
    (r"\bindustrial\s+all\s+risks?\b", "Industrial All Risks Insurance Policy"),
    (r"\bmsme\b|\bsuraksha\s+kavach\b", "ICICI Lombard MSME Suraksha Kavach Policy"),
    (r"\bcommercial\s+general\s+liability\b|\bcommecial\s+general\s+liability\b", "Commercial General Liability Insurance Policy"),
    (r"\bproducts?\s+liability\b", "Products Liability Insurance Policy"),
    (r"\bpublic\s+liability.*industrial\b", "Public Liability Insurance (Industrial Risk) Policy"),
    (r"\bpublic\s+liability.*act\b", "Public Liability Insurance (Under Public Liability Insurance Act 1991)"),
    (r"\bpublic\s+liability\b", "Public Liability Insurance Policy"),
    (r"\bsurety\s+bond\b|\bcontract\s+bond\b", "Surety Bond Bima Policy"),
    (r"\bshopkeepers?\b", "Shopkeepers Insurance Policy"),
    (r"\bburglary\s+and\s+housebreaking\b|\bburglar\s+policy\b|\bburglary\s+policy\b|\bburglar-policy\b", "Burglary and Housebreaking Insurance Policy"),
    (r"\bmarine.*voyage\b", "Marine Cargo Specific Voyage Policy"),
    (r"\bmarine.*export|marine\s+cargo\b", "Marine Cargo Export Import Insurance Policy"),
    (r"\bgroup\s+personal\s+accident\b", "Group Personal Accident Policy"),
    (r"\bgroup\s+health\b", "Group Health Insurance Policy"),
    (r"\blaghu\s+udyam\b", "Bharat Laghu Udyam Suraksha Policy"),
    (r"\bsookshma\s+udyam\b", "Bharat Sookshma Udyam Suraksha Policy"),
    (r"\bstandard\s+fire\b|\bfire.*special\s+perils\b|\bfire\s*&\s*special\s+perils\b", "Standard Fire and Special Perils Policy"),
    (r"\bfire\s+and\s+allied\s+perils\b", "Fire and Allied Perils Insurance Policy"),
    (r"\bconsequential\s+loss.*profit\b", "Consequential Loss (Fire) of Profit Policy"),
    (r"\bconsequential\s+loss\b", "Consequential Loss (Fire) Policy"),
    (r"\bbusiness\s+package\b|\bbusiness\s+guard\b", "Business Package Insurance Policy"),
]


def _looks_like_hash(value: str) -> bool:
    return bool(re.fullmatch(r"[0-9a-f]{16,}", value.strip(), flags=re.IGNORECASE))


def _is_bad_policy_name(candidate: str) -> bool:
    lower = " ".join(candidate.lower().split())
    if not lower or lower in POLICY_NAME_BLACKLIST:
        return True
    if _looks_like_hash(lower):
        return True
    if len(candidate) > 90:
        return True
    if lower.startswith(("this ", "whereas ", "in consideration ", "damaged ", "incorporated ", "promise to ", "the full ", "notes", "for the ", "limited ")):
        return True
    if any(
        phrase in lower
        for phrase in (
            "hereinafter",
            "hereafter called",
            "full premium",
            "mentioned in the said",
            "subject to",
            "entitled to",
            "sum insured",
            "established on the basis",
            "applied to",
            "during the period of insurance",
            "integral part of this contract",
            "contract of insurance",
            "insurance covers of your choice",
            "combined with the policy schedule",
            "terms, conditions, definitions",
            "promise to provide you",
            "renewal of the policy",
            "limited for the insurance",
        )
    ):
        return True
    return False


def _is_weak_filename_policy_name(candidate: str) -> bool:
    lower = candidate.lower().strip()
    if lower in {"laghu", "msme", "burglary", "terms"}:
        return True
    return len(candidate.split()) < 2


def _normalize_policy_filename(filename: str) -> str:
    """Normalize a PDF filename into a readable policy name."""
    if not filename:
        return ""

    name = Path(filename).stem
    if _looks_like_hash(name):
        return ""

    name = re.sub(r"[_\- ]?[0-9a-f]{6,}$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"(?i)([a-z])policy\b", r"\1 policy", name)
    name = re.sub(r"[_\-\.]+", " ", name)

    noise_patterns = [
        r"\bpolicy\s*wodings?\b",
        r"\bpolicy\s*wordings?\b",
        r"\bwordings?\b",
        r"\bpolicy\b",
        r"\bpdf\b",
        r"\bpw\b",
    ]
    for p in noise_patterns:
        name = re.sub(p, "", name, flags=re.IGNORECASE)

    name = re.sub(r"\b\d{4,}\b", "", name)
    name = re.sub(r"\bver\s*\d+\b", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\b\d{2}[-_]\d{2}\b", "", name)

    name = re.sub(r"\s{2,}", " ", name).strip(" -_:|")

    if not name:
        return ""

    tokens = [token for token in name.split() if token.lower() not in GENERIC_FILENAME_TOKENS]
    if not tokens:
        return ""

    normalized = " ".join(tokens).title()
    normalized = re.sub(r"\bMsme\b", "MSME", normalized)
    normalized = re.sub(r"\bSbi\b", "SBI", normalized)
    normalized = re.sub(r"\bHdfc\b", "HDFC", normalized)
    normalized = re.sub(r"\bIcici\b", "ICICI", normalized)
    normalized = re.sub(r"\bIrdan\b", "IRDAN", normalized)

    if _is_bad_policy_name(normalized):
        return ""
    if len(normalized.split()) == 1 and normalized.lower() in {"policy", "wording", "wordings"}:
        return ""
    if len(normalized) < 3:
        return ""
    return normalized


def extract_policy_name(page1_content: str, insurer_name: str | None = None, filename: str | None = None) -> str | None:
    fn_lower = (filename or "").lower()
    for pattern, canonical in CANONICAL_POLICY_MAP:
        if re.search(pattern, fn_lower, re.IGNORECASE):
            return canonical

    lines = page1_content.split("\n")
    first_lines_text = " ".join(lines[:15]).lower()
    for pattern, canonical in CANONICAL_POLICY_MAP:
        if re.search(pattern, first_lines_text, re.IGNORECASE):
            return canonical

    headings = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("#") and len(stripped) > 2:
            heading_text = re.sub(r"^#+\s*", "", stripped).strip()
            headings.append(heading_text)

    for h in headings:
        h_lower = h.lower()
        if insurer_name and insurer_name.lower() in h_lower:
            continue
        if h_lower in ["preamble", "policy wording", "operative clause"]:
            continue
        cleaned = _clean_policy_name(h)
        if _is_bad_policy_name(cleaned):
            continue
        if len(cleaned) > 5:
            return cleaned

    for line in lines[:30]:
        candidate = " ".join(line.split()).strip(" -:|")
        lower = candidate.lower()
        if (
            6 <= len(candidate) <= 100
            and ("insurance" in lower or "policy" in lower)
            and not any(term in lower for term in ("customer support", "registration", "company limited"))
            and not lower.startswith(("whereas", "in consideration", "this policy"))
        ):
            if insurer_name and insurer_name.lower() in lower and "policy" not in lower:
                continue
            cleaned = _clean_policy_name(candidate)
            if _is_bad_policy_name(cleaned):
                continue
            if len(cleaned) > 5:
                return cleaned

    return None


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

    source_file = data.get("source_file", "")
    filename_stem = Path(source_file).stem if source_file else data.get("document_id", "")
    normalized_from_filename = _normalize_policy_filename(filename_stem)
    extracted_name = extract_policy_name(first_page_text, insurer_name, filename=filename_stem)

    if normalized_from_filename and not _is_weak_filename_policy_name(normalized_from_filename):
        policy_name = normalized_from_filename
    elif extracted_name and not _is_bad_policy_name(extracted_name):
        policy_name = extracted_name
    else:
        policy_name = extracted_name or normalized_from_filename or ""

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
