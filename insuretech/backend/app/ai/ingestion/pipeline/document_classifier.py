from pathlib import Path


def classify_documents(data_dir: Path) -> None:
    """Scan available PDFs and classify each document."""
    pdf_files = sorted(data_dir.rglob("*.pdf"))
    print(f"  • Document classification stage scanning: {data_dir.resolve()}")
    print(f"  • Found {len(pdf_files)} PDF files")

    for pdf_path in pdf_files:
        classification = classify_document(pdf_path)
        print(
            f"    - {pdf_path.relative_to(data_dir)}: digital={classification['digital']}"
        )


def classify_document(pdf_path: Path) -> dict[str, str | bool]:
    """Return a classification summary for a PDF."""
    return {
        "document_type": "policy_wording",
        "digital": _is_text_searchable(pdf_path),
    }


def _is_text_searchable(pdf_path: Path) -> bool:
    try:
        import fitz
    except ImportError:
        return True

    try:
        document = fitz.open(str(pdf_path))
        for page in document:
            if page.get_text().strip():
                return True
        return False
    except Exception:
        return True
