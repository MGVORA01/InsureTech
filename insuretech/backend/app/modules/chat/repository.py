from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CustomerSupportChunk, Policy, PolicyDocument, Insurer, InsuranceCategory
from app.shared import base_repository as Base


async def commit(db: AsyncSession) -> None:
    """Commit the current transaction on the session."""
    await Base.commit(db)


async def search_similar_chunks(
    db: AsyncSession, query_embedding: list[float], limit: int = 5,
):
    distance = CustomerSupportChunk.embedding.cosine_distance(query_embedding)
    stmt = (
        select(CustomerSupportChunk, distance.label("distance"))
        .order_by(distance)
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        (chunk.chunk_text, chunk.page_number, float(1 - dist))
        for chunk, dist in rows
    ]


async def get_or_create_knowledge_document(db: AsyncSession, filename: str):
    result = await db.execute(
        select(PolicyDocument).where(
            PolicyDocument.doc_type == "knowledge_base",
            PolicyDocument.file_name == filename,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing.policy_id, existing.id

    result = await db.execute(
        select(Insurer).where(Insurer.name == "Knowledge Base")
    )
    insurer = result.scalar_one_or_none()
    if not insurer:
        insurer = await Base.create(db, Insurer, name="Knowledge Base", is_active=True)

    result = await db.execute(
        select(InsuranceCategory).where(InsuranceCategory.name == "Knowledge Base")
    )
    category = result.scalar_one_or_none()
    if not category:
        category = await Base.create(
            db, InsuranceCategory, name="Knowledge Base", is_active=True,
        )

    result = await db.execute(
        select(Policy).where(Policy.policy_name == "Project Documentation")
    )
    policy = result.scalar_one_or_none()
    if not policy:
        policy = await Base.create(
            db, Policy,
            insurer_id=insurer.id,
            insurance_category_id=category.id,
            policy_name="Project Documentation",
            is_active=True,
        )

    doc = await Base.create(
        db, PolicyDocument,
        policy_id=policy.id,
        insurer_id=insurer.id,
        doc_type="knowledge_base",
        file_name=filename,
        file_url=f"file://{filename}",
        is_active=True,
    )

    return policy.id, doc.id


async def delete_existing_chunks(db: AsyncSession, document_id: UUID):
    stmt = delete(CustomerSupportChunk).where(CustomerSupportChunk.document_id == document_id)
    await db.execute(stmt)
    await db.flush()


async def store_chunks(
    db: AsyncSession,
    chunks_with_embeddings: list[dict],
    policy_id: UUID,
    document_id: UUID,
):
    db.add_all([
        CustomerSupportChunk(
            policy_id=policy_id,
            document_id=document_id,
            chunk_index=chunk["chunk_index"],
            chunk_text=chunk["chunk_text"],
            embedding=chunk["embedding"],
            page_number=chunk["page_number"],
        )
        for chunk in chunks_with_embeddings
    ])
    await db.flush()
