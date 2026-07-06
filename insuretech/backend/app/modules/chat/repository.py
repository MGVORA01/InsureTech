from sqlalchemy import select, delete

from app.models import CustomerSupportChunk, Policy, PolicyDocument, Insurer, InsuranceCategory


async def search_similar_chunks(db, query_embedding: list[float], limit: int = 5):
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


async def get_or_create_knowledge_document(db, filename: str):
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
        insurer = Insurer(name="Knowledge Base", is_active=True)
        db.add(insurer)
        await db.flush()

    result = await db.execute(
        select(InsuranceCategory).where(InsuranceCategory.name == "Knowledge Base")
    )
    category = result.scalar_one_or_none()
    if not category:
        category = InsuranceCategory(name="Knowledge Base", is_active=True)
        db.add(category)
        await db.flush()

    result = await db.execute(
        select(Policy).where(Policy.policy_name == "Project Documentation")
    )
    policy = result.scalar_one_or_none()
    if not policy:
        policy = Policy(
            insurer_id=insurer.id,
            insurance_category_id=category.id,
            policy_name="Project Documentation",
            is_active=True,
        )
        db.add(policy)
        await db.flush()

    doc = PolicyDocument(
        policy_id=policy.id,
        insurer_id=insurer.id,
        doc_type="knowledge_base",
        file_name=filename,
        file_url=f"file://{filename}",
        is_active=True,
    )
    db.add(doc)
    await db.flush()
    await db.flush()

    return policy.id, doc.id


async def delete_existing_chunks(db, document_id):
    stmt = delete(CustomerSupportChunk).where(CustomerSupportChunk.document_id == document_id)
    await db.execute(stmt)
    await db.flush()


async def store_chunks(db, chunks_with_embeddings: list[dict], policy_id, document_id):
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
