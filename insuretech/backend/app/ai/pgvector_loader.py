import asyncio
import json
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.models import Insurer, InsuranceCategory, Policy, PolicyDocument, DocumentChunk
from app.ai.embeddings import generate_embeddings_batch
from app.ai.insurer_normalizer import normalize_insurer_name as canonicalize_insurer

CHUNK_DIR = Path(__file__).resolve().parents[2] / "chunk_output"


def load_all_chunks() -> list[dict]:
    all_chunks = []
    files = sorted(CHUNK_DIR.rglob("*.json"))
    for file in files:
        with open(file, "r", encoding="utf-8") as f:
            data = json.load(f)
        for chunk in data.get("chunks", []):
            chunk["_insurance_category"] = data.get("insurance_category", "")
            raw_insurer = data.get("insurer_name", "")
            chunk["_insurer_name"] = canonicalize_insurer(raw_insurer)
            chunk["_policy_name"] = data.get("policy_name", "")
            chunk["_document_id_raw"] = data.get("document_id", "")
        all_chunks.extend(data.get("chunks", []))
    return all_chunks


async def ensure_insurer(db: AsyncSession, name: str) -> str:
    if not name:
        name = "Unknown"
    result = await db.execute(select(Insurer).where(Insurer.name == name))
    insurer = result.scalar_one_or_none()
    if not insurer:
        insurer = Insurer(name=name)
        db.add(insurer)
        await db.flush()
    return str(insurer.id)


async def ensure_category(db: AsyncSession, name: str) -> str:
    if not name:
        name = "Unknown"
    result = await db.execute(select(InsuranceCategory).where(InsuranceCategory.name == name))
    cat = result.scalar_one_or_none()
    if not cat:
        cat = InsuranceCategory(name=name)
        db.add(cat)
        await db.flush()
    return str(cat.id)


async def ensure_policy(
    db: AsyncSession, policy_name: str, insurer_id: str, category_id: str
) -> str:
    result = await db.execute(
        select(Policy).where(
            Policy.policy_name == policy_name,
            Policy.insurer_id == insurer_id,
            Policy.insurance_category_id == category_id,
        )
    )
    policy = result.scalar_one_or_none()
    if not policy:
        policy = Policy(
            policy_name=policy_name or "Unknown",
            insurer_id=insurer_id,
            insurance_category_id=category_id,
        )
        db.add(policy)
        await db.flush()
    return str(policy.id)


async def ensure_document(
    db: AsyncSession, document_id_raw: str, policy_id: str, insurer_id: str
) -> str:
    result = await db.execute(
        select(PolicyDocument).where(PolicyDocument.file_name == document_id_raw)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        doc = PolicyDocument(
            policy_id=policy_id,
            insurer_id=insurer_id,
            doc_type="policy_wording",
            file_name=document_id_raw or "unknown",
            file_url="",
        )
        db.add(doc)
        await db.flush()
    return str(doc.id)


async def main():
    print("Loading chunks...")
    chunks = load_all_chunks()
    print(f"  {len(chunks)} total chunks loaded")

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db:
        async with db.begin():
            print("Ensuring reference data exists...")

            seen_combos = {}
            for chunk in chunks:
                key = (
                    chunk["_insurer_name"],
                    chunk["_insurance_category"],
                    chunk["_policy_name"],
                    chunk["_document_id_raw"],
                )
                if key not in seen_combos:
                    insurer_id = await ensure_insurer(db, chunk["_insurer_name"])
                    cat_id = await ensure_category(db, chunk["_insurance_category"])
                    policy_id = await ensure_policy(
                        db, chunk["_policy_name"], insurer_id, cat_id
                    )
                    doc_id = await ensure_document(
                        db, chunk["_document_id_raw"], policy_id, insurer_id
                    )
                    seen_combos[key] = {
                        "insurer_id": insurer_id,
                        "category_id": cat_id,
                        "policy_id": policy_id,
                        "document_id": doc_id,
                    }
                    print(f"    {chunk['_insurer_name'][:30]:30s} | {chunk['_insurance_category'][:25]:25s}")

            print(f"\n  {len(seen_combos)} unique policy documents resolved")

    texts = [c["text"] for c in chunks]
    print(f"\nGenerating {len(texts)} embeddings (this may take a while on CPU)...")
    embeddings = generate_embeddings_batch(texts)
    print(f"  {len(embeddings)} embeddings generated")

    async with session_factory() as db:
        batch_size = 50
        total_inserted = 0

        for i in range(0, len(chunks), batch_size):
            async with db.begin():
                batch_chunks = chunks[i : i + batch_size]
                batch_embs = embeddings[i : i + batch_size]

                for chunk, emb in zip(batch_chunks, batch_embs):
                    key = (
                        chunk["_insurer_name"],
                        chunk["_insurance_category"],
                        chunk["_policy_name"],
                        chunk["_document_id_raw"],
                    )
                    ids = seen_combos[key]

                    doc_chunk = DocumentChunk(
                        policy_id=ids["policy_id"],
                        document_id=ids["document_id"],
                        chunk_index=chunk["chunk_index"],
                        chunk_text=chunk["text"],
                        embedding=emb,
                        document_metadata={
                            "section_name": chunk.get("section_name", ""),
                            "section_type": chunk.get("section_type", ""),
                            "insurer": canonicalize_insurer(chunk.get("insurer", "")),
                            "insurance_category": chunk.get("insurance_category", ""),
                            "policy_name": chunk.get("_policy_name", ""),
                            "chunk_index": chunk.get("chunk_index", 1),
                            "total_chunks": chunk.get("total_chunks", 1),
                        },
                    )
                    db.add(doc_chunk)
                    total_inserted += 1

            print(f"  Inserted {total_inserted}/{len(chunks)} chunks")

    await engine.dispose()
    print(f"\nDone. {total_inserted} chunks stored in document_chunks.")


if __name__ == "__main__":
    asyncio.run(main())
