from sqlalchemy import select, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models import Insurer, InsuranceCategory, Policy, PolicyDocument, DocumentChunk


async def get_insurers(db: AsyncSession) -> list[Insurer]:
    result = await db.execute(
        select(Insurer).where(Insurer.is_active == True).order_by(Insurer.name)
    )
    return list(result.scalars().all())


async def get_insurer_by_id(db: AsyncSession, insurer_id: str) -> Insurer | None:
    result = await db.execute(
        select(Insurer).where(Insurer.id == insurer_id, Insurer.is_active == True)
    )
    return result.scalar_one_or_none()


async def create_insurer(db: AsyncSession, data: dict) -> Insurer:
    insurer = Insurer(**data)
    db.add(insurer)
    await db.flush()
    return insurer


async def update_insurer(db: AsyncSession, insurer_id: str, data: dict) -> Insurer | None:
    result = await db.execute(
        update(Insurer).where(Insurer.id == insurer_id).values(**data).returning(Insurer)
    )
    await db.flush()
    return result.scalar_one_or_none()


async def soft_delete_insurer(db: AsyncSession, insurer_id: str) -> bool:
    result = await db.execute(
        update(Insurer).where(Insurer.id == insurer_id).values(is_active=False).returning(Insurer.id)
    )
    await db.flush()
    return result.scalar() is not None


async def get_categories(db: AsyncSession) -> list[InsuranceCategory]:
    result = await db.execute(
        select(InsuranceCategory).where(InsuranceCategory.is_active == True).order_by(InsuranceCategory.name)
    )
    return list(result.scalars().all())


async def get_category_by_id(db: AsyncSession, category_id: str) -> InsuranceCategory | None:
    result = await db.execute(
        select(InsuranceCategory).where(InsuranceCategory.id == category_id, InsuranceCategory.is_active == True)
    )
    return result.scalar_one_or_none()


async def create_category(db: AsyncSession, data: dict) -> InsuranceCategory:
    cat = InsuranceCategory(**data)
    db.add(cat)
    await db.flush()
    return cat


async def update_category(db: AsyncSession, category_id: str, data: dict) -> InsuranceCategory | None:
    result = await db.execute(
        update(InsuranceCategory).where(InsuranceCategory.id == category_id).values(**data).returning(InsuranceCategory)
    )
    await db.flush()
    return result.scalar_one_or_none()


async def soft_delete_category(db: AsyncSession, category_id: str) -> bool:
    result = await db.execute(
        update(InsuranceCategory).where(InsuranceCategory.id == category_id).values(is_active=False).returning(InsuranceCategory.id)
    )
    await db.flush()
    return result.scalar() is not None


async def get_policies(
    db: AsyncSession,
    page: int = 1,
    limit: int = 10,
    insurer_id: str | None = None,
    category_id: str | None = None,
    search: str | None = None,
) -> tuple[list[Policy], int]:
    query = select(Policy).where(Policy.is_active == True)
    count_query = select(func.count(Policy.id)).where(Policy.is_active == True)

    if insurer_id:
        query = query.where(Policy.insurer_id == insurer_id)
        count_query = count_query.where(Policy.insurer_id == insurer_id)
    if category_id:
        query = query.where(Policy.insurance_category_id == category_id)
        count_query = count_query.where(Policy.insurance_category_id == category_id)
    if search:
        pattern = f"%{search}%"
        query = query.where(Policy.policy_name.ilike(pattern))
        count_query = count_query.where(Policy.policy_name.ilike(pattern))

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Policy.policy_name).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_policy_by_id(db: AsyncSession, policy_id: str) -> Policy | None:
    result = await db.execute(
        select(Policy)
        .where(Policy.id == policy_id, Policy.is_active == True)
        .options(selectinload(Policy.documents))
    )
    return result.scalar_one_or_none()


async def create_policy(db: AsyncSession, data: dict) -> Policy:
    policy = Policy(**data)
    db.add(policy)
    await db.flush()
    return policy


async def update_policy(db: AsyncSession, policy_id: str, data: dict) -> Policy | None:
    result = await db.execute(
        update(Policy).where(Policy.id == policy_id).values(**data).returning(Policy)
    )
    await db.flush()
    return result.scalar_one_or_none()


async def soft_delete_policy(db: AsyncSession, policy_id: str) -> bool:
    result = await db.execute(
        update(Policy).where(Policy.id == policy_id).values(is_active=False).returning(Policy.id)
    )
    await db.flush()
    return result.scalar() is not None


async def create_document(
    db: AsyncSession,
    policy_id: str,
    insurer_id: str,
    file_name: str,
    file_url: str,
    doc_type: str = "policy_wording",
    file_size: int | None = None,
) -> PolicyDocument:
    doc = PolicyDocument(
        policy_id=policy_id,
        insurer_id=insurer_id,
        doc_type=doc_type,
        file_name=file_name,
        file_url=file_url,
        file_size=file_size,
    )
    db.add(doc)
    await db.flush()
    return doc


async def delete_document_chunks(db: AsyncSession, document_id: str):
    await db.execute(
        delete(DocumentChunk).where(DocumentChunk.document_id == document_id)
    )
    await db.flush()


async def insert_chunk(db: AsyncSession, policy_id: str, document_id: str, chunk_index: int, chunk_text: str, embedding: list[float], metadata: dict):
    chunk = DocumentChunk(
        policy_id=policy_id,
        document_id=document_id,
        chunk_index=chunk_index,
        chunk_text=chunk_text,
        embedding=embedding,
        document_metadata=metadata,
    )
    db.add(chunk)
