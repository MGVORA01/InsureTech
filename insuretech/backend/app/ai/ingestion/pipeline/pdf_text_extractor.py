from pathlib import Path
from typing import Any

from app.ai.ingestion.pipeline.document_classifier import classify_document
from app.ai.ingestion.pipeline.policy_document_parser import parse_policy


def parse_pdf(pdf_path: Path) -> dict[str, Any]:
    """Extract a PDF with PyMuPDF first and LlamaParse/OCR only when needed."""
    classification = classify_document(pdf_path)
    if classification.get("digital"):
        try:
            extracted = _extract_with_pymupdf(pdf_path)
            if extracted["raw_text"].strip():
                return extracted
        except (ImportError, RuntimeError):
            pass

    ocr_result = _extract_with_ocr(pdf_path)
    if ocr_result is not None and ocr_result["raw_text"].strip():
        return ocr_result

    # LlamaParse is useful for complex layouts.  It is intentionally a fallback,
    # so normal text PDFs do not require an external API call.
    try:
        return parse_policy(pdf_path)
    except Exception as exc:
        raise RuntimeError(
            f"Could not extract {pdf_path.name}. Install/configure OCR or set "
            "LLAMA_PARSE_API_KEY for scanned/complex PDFs."
        ) from exc


def _extract_with_pymupdf(pdf_path: Path) -> dict[str, Any]:
    import fitz

    document = fitz.open(str(pdf_path))
    try:
        pdf_title = str(document.metadata.get("title") or "").strip()
        pages = []
        for number, page in enumerate(document, start=1):
            content = page.get_text("text")
            # PyMuPDF's table finder retains header/value relationships.  The
            # markdown representation is indexable and still readable by a LLM.
            try:
                tables = page.find_tables()
                table_text = []
                for table in tables.tables:
                    rows = table.extract()
                    if rows:
                        table_text.append(_table_to_markdown(rows))
                if table_text:
                    content = f"{content}\n\n" + "\n\n".join(table_text)
            except Exception:
                # Table recognition varies by PyMuPDF version; normal text must
                # remain ingestible if it is unavailable.
                pass
            pages.append({"page_number": number, "content": content})
    finally:
        document.close()

    raw_text = "\n\n".join(page["content"] for page in pages)
    return {
        "source_file": pdf_path.name,
        "document_id": pdf_path.stem,
        "insurance_category": pdf_path.parent.name,
        "page_count": len(pages),
        "raw_text_length": len(raw_text),
        "raw_text": raw_text,
        "pages": pages,
        "pdf_title": pdf_title,
    }


def _table_to_markdown(rows: list[list[str | None]]) -> str:
    normalized = [[("" if cell is None else " ".join(str(cell).split())) for cell in row] for row in rows]
    normalized = [row for row in normalized if any(row)]
    if not normalized:
        return ""
    width = max(len(row) for row in normalized)
    normalized = [row + [""] * (width - len(row)) for row in normalized]
    header = normalized[0]
    return "\n".join([
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(["---"] * width) + " |",
        *["| " + " | ".join(row) + " |" for row in normalized[1:]],
    ])


def _extract_with_ocr(pdf_path: Path) -> dict[str, Any] | None:
    """Use local Tesseract when installed; otherwise let the parser fallback run."""
    try:
        import fitz
        import pytesseract
    except ImportError:
        return None
    document = fitz.open(str(pdf_path))
    try:
        pages = []
        for number, page in enumerate(document, start=1):
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            text = pytesseract.image_to_string(pixmap.tobytes("png"))
            pages.append({"page_number": number, "content": text})
    except Exception:
        return None
    finally:
        document.close()
    raw_text = "\n\n".join(page["content"] for page in pages)
    return {
        "source_file": pdf_path.name, "document_id": pdf_path.stem,
        "insurance_category": pdf_path.parent.name, "page_count": len(pages),
        "raw_text_length": len(raw_text), "raw_text": raw_text, "pages": pages,
    }
