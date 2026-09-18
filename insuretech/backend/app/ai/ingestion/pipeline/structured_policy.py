"""Page-aware policy structure extraction used by the upload ingestion path.

The batch pipeline predates the API upload path and works on flattened text.
This module deliberately keeps page provenance and the heading/clause path while
remaining dependency-free enough to work for OCR output too.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from app.ai.ingestion.pipeline.policy_section_detector import classify_section

_NUMBERED_HEADING = re.compile(
    r"^(?P<number>(?:\d+(?:\.\d+){0,4}|[IVXLC]+)\.?)[\s:-]+(?P<title>[A-Z][A-Za-z0-9 ,/&()'\-]{2,100})$"
)
_CLAUSE = re.compile(r"^(?P<number>\d+(?:\.\d+){1,5}|[a-z]|\([a-z0-9ivx]+\))[.)]?\s+(?P<text>.+)$", re.I)
_TITLE_NOISE = re.compile(r"\b(?:page\s*\d+|policy wording|table of contents|index)\b", re.I)


def source_pdf_name(file_name: str) -> str:
    return Path(file_name).name


def extract_policy_name(pages: list[dict[str, Any]], file_name: str, pdf_title: str | None = None) -> str:
    """Use only document evidence; filename is the required final fallback."""
    first_page = "\n".join(page.get("content", "") for page in pages[:1])
    lines = [" ".join(line.split()) for line in first_page.splitlines()]
    # Product/policy labels are more reliable than generic large first-page text.
    for line in lines[:40]:
        if 4 <= len(line) <= 160 and re.search(r"\b(policy|insurance|cover)\b", line, re.I):
            if not _TITLE_NOISE.search(line) and not re.search(r"^(issued|schedule|certificate)\b", line, re.I):
                return line.strip(" -:|")
    for line in lines[:20]:
        if 4 <= len(line) <= 120 and not _TITLE_NOISE.search(line):
            return line.strip(" -:|")
    if pdf_title and pdf_title.strip():
        return pdf_title.strip()
    return source_pdf_name(file_name)


def extract_structured_sections(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return sections with page, subsection and clause provenance.

    Headings are detected conservatively: when no heading is found, one section
    per page is retained rather than pretending the PDF has a known structure.
    """
    sections: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    current_subsection: str | None = None

    for page in pages:
        page_number = page["page_number"]
        lines = [line.strip() for line in page.get("content", "").splitlines() if line.strip()]
        if not lines:
            continue
        for line in lines:
            heading = _NUMBERED_HEADING.match(line)
            # All-caps headings occur frequently in policy wordings.
            is_caps_heading = (
                4 <= len(line) <= 100
                and line.upper() == line
                and len(re.findall(r"[A-Z]", line)) >= 3
                and re.fullmatch(r"[A-Z0-9 /().,&-]+", line) is not None
            )
            if heading or is_caps_heading:
                title = (heading.group("title") if heading else line).strip(" :-")
                level = heading.group("number").count(".") + 1 if heading else 1
                if heading and title.lower().startswith(("section", "part", "chapter")):
                    level = 1
                if current is None or level <= 1:
                    current = {
                        "heading": title,
                        "type": classify_section(title),
                        "page_number": page_number,
                        "subsection": None,
                        "clauses": [],
                        "content_lines": [],
                    }
                    sections.append(current)
                    current_subsection = None
                else:
                    current_subsection = title
                continue

            if current is None:
                current = {
                    "heading": "Policy wording",
                    "type": "other",
                    "page_number": page_number,
                    "subsection": None,
                    "clauses": [],
                    "content_lines": [],
                }
                sections.append(current)
            clause = _CLAUSE.match(line)
            if clause:
                current["clauses"].append({
                    "clause_id": clause.group("number"),
                    "subsection": current_subsection,
                    "page_number": page_number,
                    "text": clause.group("text"),
                })
            else:
                current["content_lines"].append({
                    "text": line, "page_number": page_number, "subsection": current_subsection,
                })

    for section in sections:
        # Keep non-numbered content, including table lines, under the active path.
        for item in section.pop("content_lines"):
            section["clauses"].append({
                "clause_id": None,
                "subsection": item["subsection"],
                "page_number": item["page_number"],
                "text": item["text"],
            })
        section["content"] = "\n".join(item["text"] for item in section["clauses"])
    return sections
