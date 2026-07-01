import os
import uuid
import tempfile
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.ai.policy_extractor import parse_policy, LLAMA_PARSE_API_KEY
from app.ai.policy_cleaner import clean_page_text, is_admin_page
from app.ai.metadata_extractor import clean_insurer_name
from app.ai.section_detector import extract_sections, merge_consecutive_same_type, merge_insurer_headers
from app.ai.policy_chunker import chunk_section
from app.ai.embeddings import generate_embeddings_batch
from app.ai.insurer_normalizer import normalize_insurer_name as canonicalize_insurer
from app.modules.policies import repository as Repo


async def ingest_single_pdf(
    db: AsyncSession,
    pdf_bytes: bytes,
    file_name: str,
    policy_id: str,
    policy_name: str,
    insurer_name: str,
    insurance_category: str,
    insurer_id: str,
    document_id_raw: str | None = None,
) -> tuple[str, int]:
    doc_id = document_id_raw or Path(file_name).stem
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name

        parsed = parse_policy(Path(tmp_path))
        pages = parsed.get("pages", [])
        if not pages:
            raise ValueError("No pages extracted from PDF")

        cleaned_pages = []
        for page in pages:
            content = page.get("content", "")
            if is_admin_page(content):
                continue
            cleaned = clean_page_text(content)
            if cleaned.strip():
                cleaned_pages.append({
                    "page_number": page["page_number"],
                    "content": cleaned,
                })

        cleaned_text = "\n\n".join(p["content"] for p in cleaned_pages)
        if not cleaned_text.strip():
            raise ValueError("No text content after cleaning")

        sections = extract_sections(cleaned_text)
        sections = merge_consecutive_same_type(sections)
        sections = merge_insurer_headers(sections)

        doc_info = {
            "document_id": doc_id,
            "insurance_category": insurance_category,
            "insurer_name": canonicalize_insurer(insurer_name) or insurer_name,
            "policy_name": policy_name,
        }
        all_chunks = []
        for section in sections:
            chunks = chunk_section(section, doc_info)
            all_chunks.extend(chunks)

        if not all_chunks:
            all_chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "document_id": doc_id,
                "policy_name": policy_name,
                "insurer": canonicalize_insurer(insurer_name) or insurer_name,
                "insurance_category": insurance_category,
                "section_name": "full_text",
                "section_type": "other",
                "chunk_index": 1,
                "total_chunks": 1,
                "text": cleaned_text,
            })

        texts = [c["text"] for c in all_chunks]
        embeddings = generate_embeddings_batch(texts)

        doc = await Repo.create_document(
            db=db,
            policy_id=policy_id,
            insurer_id=insurer_id,
            file_name=file_name,
            file_url="",
            doc_type="policy_wording",
            file_size=len(pdf_bytes),
        )

        canonical_insurer = canonicalize_insurer(insurer_name) or insurer_name
        for chunk_data, emb in zip(all_chunks, embeddings):
            await Repo.insert_chunk(
                db=db,
                policy_id=policy_id,
                document_id=str(doc.id),
                chunk_index=chunk_data["chunk_index"],
                chunk_text=chunk_data["text"],
                embedding=emb,
                metadata={
                    "section_name": chunk_data["section_name"],
                    "section_type": chunk_data["section_type"],
                    "insurer": canonical_insurer,
                    "insurance_category": insurance_category,
                    "policy_name": policy_name,
                    "chunk_index": chunk_data["chunk_index"],
                    "total_chunks": chunk_data["total_chunks"],
                    "file_name": file_name,
                },
            )

        await db.flush()
        return str(doc.id), len(all_chunks)

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
