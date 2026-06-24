# app/ai/policy_cleaner.py

from pathlib import Path
import json
import re
from collections import Counter


INPUT_DIR = Path("parsed_output")
OUTPUT_DIR = Path("cleaned_output")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# =====================================================
# Patterns
# =====================================================

HEADER_PATTERNS = [
    r"ICICI\s*Lombard",
    r"HDFC\s*ERGO",
    r"TATA\s*AIG",
    r"Nibhaye\s*Vaade",
    r"Policy\s*Wordings",
]

FOOTER_PATTERNS = [
    r"Free\s*No[:\s]",
    r"Alternate\s*No[:\s]",
    r"E-mail[:\s]",
    r"Email[:\s]",
    r"Website[:\s]",
    r"www\.",
    r"IRDA[I]?",
    r"CIN[:\s]",
    r"Registered\s*Office",
    r"Mailing\s*Address",
    r"Customer\s*Service\s*Address",
    r"Toll\s*Free",
]

ADMIN_PAGE_KEYWORDS = [
    "insurance ombudsman",
    "grievance redressal",
    "grievance",
    "bimalokpal",
    "customer support",
    "branch office",
    "branch offices",
    "governing body of insurance council",
]

REMOVE_LINE_PATTERNS = [
    r"^UIN[:\s].*$",
    r"^IRDA[I]?\s.*$",
    r"^CIN[:\s].*$",
    r"^Fax[:\s].*$",
    r"^Tel[:\s].*$",
    r"^Phone[:\s].*$",
    r"^Toll[- ]?Free[:\s].*$",
]

# =====================================================
# Utilities
# =====================================================


def normalize_whitespace(text: str) -> str:
    """
    Preserve tables and section structure.
    """
    text = text.replace("\r", "")

    # remove trailing spaces
    text = re.sub(r"[ \t]+$", "", text, flags=re.MULTILINE)

    # collapse excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def remove_noise_lines(text: str):
    cleaned_lines = []

    for line in text.splitlines():

        stripped = line.strip()

        if not stripped:
            cleaned_lines.append("")
            continue

        remove = False

        for pattern in REMOVE_LINE_PATTERNS:
            if re.search(pattern, stripped, re.IGNORECASE):
                remove = True
                break

        if not remove:
            cleaned_lines.append(line)

    return "\n".join(cleaned_lines)


def remove_footer_blocks(text: str):
    lines = []

    for line in text.splitlines():

        lower = line.lower()

        if any(
            re.search(pattern, line, re.IGNORECASE)
            for pattern in FOOTER_PATTERNS
        ):
            continue

        lines.append(line)

    return "\n".join(lines)


def remove_header_lines(text: str):
    lines = []

    for line in text.splitlines():

        remove = False

        for pattern in HEADER_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                remove = True
                break

        if not remove:
            lines.append(line)

    return "\n".join(lines)


def is_admin_page(text: str) -> bool:
    """
    Remove only pages that are heavily dominated
    by grievance / ombudsman content.
    """

    lower = text.lower()

    hits = 0

    for keyword in ADMIN_PAGE_KEYWORDS:
        if keyword in lower:
            hits += 1

    return hits >= 3


def clean_page(text: str):
    """
    Preserve tables.
    Preserve markdown headings.
    Remove noise.
    """

    text = remove_header_lines(text)
    text = remove_footer_blocks(text)
    text = remove_noise_lines(text)
    text = normalize_whitespace(text)

    return text


# =====================================================
# Main Processing
# =====================================================

def process_file(json_path: Path):

    with open(json_path, "r", encoding="utf-8") as f:
        doc = json.load(f)

    cleaned_pages = []

    removed_pages = []

    stats = {
        "pages_removed": 0,
        "pages_kept": 0,
    }

    for page in doc["pages"]:

        page_number = page["page_number"]
        content = page["content"]

        if is_admin_page(content):
            removed_pages.append(page_number)
            stats["pages_removed"] += 1
            continue

        cleaned_content = clean_page(content)

        if not cleaned_content.strip():
            removed_pages.append(page_number)
            stats["pages_removed"] += 1
            continue

        cleaned_pages.append(
            {
                "page_number": page_number,
                "content": cleaned_content,
            }
        )

        stats["pages_kept"] += 1

    cleaned_text = "\n\n".join(
        page["content"]
        for page in cleaned_pages
    )

    output = {
        "source_file": doc["source_file"],
        "document_id": doc["document_id"],
        "insurance_category": doc["insurance_category"],

        "page_count": len(cleaned_pages),

        "cleaned_text_length": len(cleaned_text),

        "removed_pages": removed_pages,

        "cleaning_stats": stats,

        "cleaned_text": cleaned_text,

        "pages": cleaned_pages,
    }

    output_file = (
        OUTPUT_DIR /
        f"{doc['document_id']}.json"
    )

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(
            output,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(
        f"✓ Cleaned: {doc['document_id']} "
        f"({stats['pages_kept']} pages)"
    )
    print("Original length:", len(doc["raw_text"])),
    print("Cleaned length:", len(cleaned_text))


def main():

    files = list(INPUT_DIR.rglob("*.json"))
#     files = [
#     Path(
#         "parsed_output/Industry_All_risk/pw_msme_pdf.json"
#     )
# ]
    print(f"\nFound {len(files)} files\n")

    for file in files:
        try:
            process_file(file)
        except Exception as e:
            print(
                f"✗ Failed: {file.name}"
            )
            print(e)

    print("\nCleaning complete.")


if __name__ == "__main__":
    main()