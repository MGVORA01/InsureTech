import json
import re
from pathlib import Path
from app.ai.insurer_normalizer import CANONICAL_MAP

OUTPUT_BASE_DIR = Path(__file__).resolve().parents[2] / "output"
CLEANED_DIR = OUTPUT_BASE_DIR / "cleaned_output"
METADATA_DIR = OUTPUT_BASE_DIR / "metadata_output"
SECTION_DIR = OUTPUT_BASE_DIR / "section_output"

SECTION_TYPE_RULES = [
    ("coverage", [
        r"^what\s+is\s+covered",
        r"scope\s+of\s+cover",
        r"insured\s+events?",
        r"risks?\s+covered",
        r"what\s+we\s+cover",
        r"what\s+this\s+policy\s+covers",
        r"operative\s+clause",
        r"insuring\s+agreement",
        r"insuring\s+clause",
        r"all\s+coverage\s+sections?",
        r"coverage\s+section",
        r"^cover\b",
        r"benefits?",
        r"preamble",
        r"whereas",
    ]),
    ("definitions", [
        r"^definitions?",
        r"special\s+meanings?",
        r"interpretation",
        r"meaning\s+of\s+words?",
    ]),
    ("conditions", [
        r"(?:general|special|policy)\s+conditions",
        r"conditions?\s+precedent",
        r"obligations?\s+of\s+the\s+insured",
        r"duty\s+of\s+disclosure",
        r"reasonable\s+care",
        r"observance\s+of\s+conditions",
        r"^conditions?\b",
    ]),
    ("claims", [
        r"claims?\s+procedure",
        r"claims?\s+provisions?",
        r"how\s+to\s+claim",
        r"notice\s+of\s+claims?",
        r"claims?\s+settlement",
        r"duty\s+of\s+assured",
        r"duties?\s+(?:following|after)\s+(?:an\s+)?accident",
        r"claims?\s+provisions?\s+and\s+procedures?",
        r"^claims?\b",
    ]),
    ("exclusions", [
        r"^exclusions?",
        r"special\s+exclusions?",
        r"general\s+exceptions?",
        r"what\s+is\s+not\s+covered",
        r"losses?\s+excluded",
        r"excluded\s+property",
    ]),
    ("financial", [
        r"sum\s+insured",
        r"^premium",
        r"^excess",
        r"deductible",
        r"limit\s+of\s+indemnity",
        r"limits?\s+of\s+liability",
        r"basis\s+of\s+indemnity",
        r"basis\s+of\s+settlement",
        r"reinstatement",
        r"underinsurance",
        r"valuation",
        r"loss\s+settlement",
        r"indemnity\s+period",
        r"restoration\s+of\s+sum\s+insured",
    ]),
    ("legal", [
        r"arbitration",
        r"jurisdiction",
        r"governing\s+law",
        r"subrogation",
        r"recourse",
        r"cancellation",
        r"termination",
        r"transfer\s+of\s+interest",
        r"fraudulent\s+claims?",
        r"other\s+insurance",
        r"contribution",
        r"right\s+to\s+inspect",
        r"position\s+after\s+(?:a\s+)?claim",
        r"cause\s+of\s+action",
        r"limitation\s+period",
    ]),
    ("administrative", [
        r"^renewal",
        r"notices?",
        r"customer\s+service",
        r"grievance",
        r"complaint",
        r"policy\s+disputes?",
        r"redressal\s+of\s+grievance",
        r"condonation\s+of\s+delay",
    ]),
]

SECTION_BLACKLIST = [
    "insurance ombudsman",
    "office of the insurance ombudsman",
    "office of the governing body",
    "registered office",
    "corporate office",
    "mailing address",
    "toll free",
]


def classify_section(heading: str) -> str:
    lower = heading.lower().strip()
    for kw in SECTION_BLACKLIST:
        if kw in lower:
            return "administrative"
    for section_type, patterns in SECTION_TYPE_RULES:
        for pattern in patterns:
            if re.search(pattern, lower):
                return section_type
    return "other"


def extract_sections(text: str) -> list:
    heading_pattern = re.compile(r"^(#+)\s+(.+)$", re.MULTILINE)
    matches = list(heading_pattern.finditer(text))

    sections = []
    seen_headings = set()
    consecutive_same = 0

    for i, match in enumerate(matches):
        level = len(match.group(1))
        heading_text = match.group(2).strip()

        if len(heading_text) < 3:
            continue

        if re.match(r"^\d+\.?\s*$", heading_text):
            continue

        if re.match(r"^[IVXLCDM]+\.?\s*$", heading_text) and len(heading_text) <= 5:
            continue

        dedup_key = heading_text.lower().strip()
        if dedup_key in seen_headings:
            consecutive_same += 1
            if consecutive_same > 2:
                continue
        else:
            consecutive_same = 0
            seen_headings.add(dedup_key)

        start_pos = match.end()
        if i + 1 < len(matches):
            end_pos = matches[i + 1].start()
        else:
            end_pos = len(text)

        content = text[start_pos:end_pos].strip()
        section_type = classify_section(heading_text)

        sections.append({
            "heading": heading_text,
            "type": section_type,
            "level": level,
            "content": content,
            "char_count": len(content),
        })

    return sections


def merge_consecutive_same_type(sections: list) -> list:
    if not sections:
        return sections

    merged = [sections[0]]
    for s in sections[1:]:
        last = merged[-1]
        if s["type"] == last["type"] and s["type"] != "other" and last["type"] != "other":
            last["content"] += "\n\n" + s["content"]
            last["char_count"] = len(last["content"])
        else:
            merged.append(s)
    return merged


def _normalize_insurer(name: str) -> str:
    name = name.lower().strip()
    name = re.sub(r"\b(limited|ltd|co\.?|company|the|and|of)\b", "", name)
    name = re.sub(r"[^a-z0-9\s]", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def _is_insurer_heading(heading: str) -> bool:
    normalized = _normalize_insurer(heading)
    if len(normalized) < 8:
        return False
    for canonical in set(CANONICAL_MAP.values()):
        known_norm = _normalize_insurer(canonical)
        if normalized == known_norm:
            return True
    return False


def merge_insurer_headers(sections: list) -> list:
    if not sections:
        return sections

    merged = [sections[0]]
    for s in sections[1:]:
        last = merged[-1]
        if _is_insurer_heading(s["heading"]):
            last["content"] += "\n\n" + s["content"]
            last["char_count"] = len(last["content"])
        else:
            merged.append(s)
    return merged


def process_file(cleaned_path: Path, metadata_path: Path):
    with open(cleaned_path, "r", encoding="utf-8") as f:
        cleaned = json.load(f)

    metadata = {}
    if metadata_path.exists():
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

    text = cleaned.get("cleaned_text", "")
    if not text:
        print(f"  ✗ Skipped (no text): {cleaned_path.name}")
        return

    sections = extract_sections(text)
    sections = merge_consecutive_same_type(sections)
    sections = merge_insurer_headers(sections)

    output = {
        "document_id": cleaned.get("document_id", ""),
        "source_file": cleaned.get("source_file", ""),
        "insurance_category": cleaned.get("insurance_category", ""),
        "insurer_name": metadata.get("insurer_name", ""),
        "policy_name": metadata.get("policy_name", ""),
        "uin": metadata.get("uin", ""),
        "page_count": cleaned.get("page_count", 0),
        "section_count": len(sections),
        "sections": sections,
    }

    rel_path = cleaned_path.relative_to(CLEANED_DIR)
    out_dir = SECTION_DIR / rel_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    output_file = out_dir / f"{cleaned['document_id']}.json"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    type_counts = {}
    for s in sections:
        t = s["type"]
        type_counts[t] = type_counts.get(t, 0) + 1
    type_summary = ", ".join(f"{k}={v}" for k, v in sorted(type_counts.items()))
    print(f"  ✓ {cleaned['document_id']} — {len(sections)} sections [{type_summary}]")


def main():
    files = sorted(CLEANED_DIR.rglob("*.json"))
    print(f"\nFound {len(files)} cleaned files\n")

    for cleaned_path in files:
        metadata_path = METADATA_DIR / cleaned_path.relative_to(CLEANED_DIR)
        try:
            process_file(cleaned_path, metadata_path)
        except Exception as e:
            print(f"  ✗ Failed: {cleaned_path.name} — {e}")

    print("\nSection detection complete.\n")


if __name__ == "__main__":
    main()
