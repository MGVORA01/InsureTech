"""Database access layer for policy workflows."""

from typing import Any

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import DocumentChunk, InsuranceCategory, Insurer, Policy, PolicyDocument
from app.modules.policies.constants import (
    POLICY_WORDING_DOC_TYPE,
    SEARCH_PATTERN_TEMPLATE,
)
from app.shared import base_repository as Base


async def get_insurers(db: AsyncSession) -> list[Insurer]:
    """Fetch active insurers ordered by name."""
    result = await db.execute(
        select(Insurer).where(Insurer.is_active.is_(True)).order_by(Insurer.name)
    )
    return list(result.scalars().all())


async def get_insurer_by_id(db: AsyncSession, insurer_id: str) -> Insurer | None:
    """Fetch an active insurer by ID."""
    return await Base.get_by_id(db, Insurer, insurer_id, active_only=True)


async def create_insurer(db: AsyncSession, data: dict[str, Any]) -> Insurer:
    """Create and persist an insurer."""
    return await Base.create(db, Insurer, **data)


async def update_insurer(
    db: AsyncSession,
    insurer_id: str,
    data: dict[str, Any],
) -> Insurer | None:
    """Update an insurer by mutating and flushing the ORM object."""
    insurer = await Base.get_by_id(db, Insurer, insurer_id, active_only=True)
    if not insurer:
        return None
    for key, value in data.items():
        setattr(insurer, key, value)
    await db.flush()
    await db.refresh(insurer)
    return insurer


async def soft_delete_insurer(db: AsyncSession, insurer_id: str) -> Insurer | None:
    """Soft-delete an insurer by marking it inactive."""
    return await Base.soft_delete(db, Insurer, insurer_id)


async def get_categories(db: AsyncSession) -> list[InsuranceCategory]:
    """Fetch active insurance categories ordered by name."""
    result = await db.execute(
        select(InsuranceCategory)
        .where(InsuranceCategory.is_active.is_(True))
        .order_by(InsuranceCategory.name)
    )
    return list(result.scalars().all())


async def get_category_by_id(
    db: AsyncSession, category_id: str
) -> InsuranceCategory | None:
    """Fetch an active insurance category by ID."""
    return await Base.get_by_id(db, InsuranceCategory, category_id, active_only=True)


async def create_category(
    db: AsyncSession,
    data: dict[str, Any],
) -> InsuranceCategory:
    """Create and persist an insurance category."""
    return await Base.create(db, InsuranceCategory, **data)


async def update_category(
    db: AsyncSession,
    category_id: str,
    data: dict[str, Any],
) -> InsuranceCategory | None:
    """Update an insurance category by mutating and flushing the ORM object."""
    category = await Base.get_by_id(
        db,
        InsuranceCategory,
        category_id,
        active_only=True,
    )
    if not category:
        return None
    for key, value in data.items():
        setattr(category, key, value)
    await db.flush()
    await db.refresh(category)
    return category


async def soft_delete_category(db: AsyncSession, category_id: str) -> InsuranceCategory | None:
    """Soft-delete an insurance category by marking it inactive."""
    return await Base.soft_delete(db, InsuranceCategory, category_id)


async def get_policies(
    db: AsyncSession,
    page: int = 1,
    limit: int = 10,
    insurer_id: str | None = None,
    category_id: str | None = None,
    search: str | None = None,
) -> tuple[list[Policy], int]:
    """Fetch active policies with pagination and optional filters."""
    query = (
        select(Policy)
        .where(Policy.is_active.is_(True))
        .options(selectinload(Policy.insurer), selectinload(Policy.insurance_category))
    )
    count_query = select(func.count(Policy.id)).where(Policy.is_active.is_(True))

    if insurer_id:
        query = query.where(Policy.insurer_id == insurer_id)
        count_query = count_query.where(Policy.insurer_id == insurer_id)
    if category_id:
        query = query.where(Policy.insurance_category_id == category_id)
        count_query = count_query.where(Policy.insurance_category_id == category_id)
    if search:
        pattern = SEARCH_PATTERN_TEMPLATE.format(search=search)
        query = query.where(Policy.policy_name.ilike(pattern))
        count_query = count_query.where(Policy.policy_name.ilike(pattern))

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Policy.policy_name).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_policy_by_id(db: AsyncSession, policy_id: str) -> Policy | None:
    """Fetch an active policy by ID with display relationships."""
    result = await db.execute(
        select(Policy)
        .where(Policy.id == policy_id, Policy.is_active.is_(True))
        .options(
            selectinload(Policy.insurer),
            selectinload(Policy.insurance_category),
            selectinload(Policy.documents),
        )
    )
    return result.scalar_one_or_none()


async def create_policy(db: AsyncSession, data: dict[str, Any]) -> Policy:
    """Create and persist a policy."""
    return await Base.create(db, Policy, **data)


async def update_policy(
    db: AsyncSession,
    policy_id: str,
    data: dict[str, Any],
) -> Policy | None:
    """Update a policy by mutating and flushing the ORM object.

    Relationships (insurer, insurance_category) are eagerly loaded so the
    caller can serialize them without an extra round-trip.
    """
    policy = await Base.get_by_id(
        db, Policy, policy_id,
        options=[selectinload(Policy.insurer), selectinload(Policy.insurance_category)],
        active_only=True,
    )
    if not policy:
        return None
    for key, value in data.items():
        setattr(policy, key, value)
    await db.flush()
    await db.refresh(policy)
    return policy


async def soft_delete_policy(db: AsyncSession, policy_id: str) -> Policy | None:
    """Soft-delete a policy by marking it inactive."""
    return await Base.soft_delete(db, Policy, policy_id)


async def create_document(
    db: AsyncSession,
    policy_id: str,
    insurer_id: str,
    file_name: str,
    file_url: str,
    doc_type: str = POLICY_WORDING_DOC_TYPE,
    file_size: int | None = None,
    version: int = 1,
) -> PolicyDocument:
    """Create and persist a policy document."""
    return await Base.create(
        db,
        PolicyDocument,
        policy_id=policy_id,
        insurer_id=insurer_id,
        doc_type=doc_type,
        file_name=file_name,
        file_url=file_url,
        file_size=file_size,
        version=version,
    )


async def get_policy_for_upload(db: AsyncSession, policy_id: str) -> Policy | None:
    """Fetch a policy for PDF upload with related display data."""
    result = await db.execute(
        select(Policy)
        .where(Policy.id == policy_id, Policy.is_active.is_(True))
        .options(
            selectinload(Policy.insurer),
            selectinload(Policy.insurance_category),
        )
    )
    return result.scalar_one_or_none()


async def get_active_documents_for_policy(
    db: AsyncSession, policy_id: str
) -> list[PolicyDocument]:
    """Fetch active documents for a policy ordered by version."""
    result = await db.execute(
        select(PolicyDocument)
        .where(
            PolicyDocument.policy_id == policy_id,
            PolicyDocument.is_active.is_(True),
        )
        .order_by(PolicyDocument.version)
    )
    return list(result.scalars().all())


async def get_document_count_for_policy(db: AsyncSession, policy_id: str) -> int:
    """Count active documents for a policy."""
    result = await db.execute(
        select(func.count(PolicyDocument.id)).where(
            PolicyDocument.policy_id == policy_id,
            PolicyDocument.is_active.is_(True),
        )
    )
    return result.scalar() or 0


async def get_document_counts_for_policies(
    db: AsyncSession,
    policy_ids: list[str],
) -> dict[str, int]:
    """Batch count active documents for multiple policies (eliminates N+1)."""
    if not policy_ids:
        return {}
    result = await db.execute(
        select(
            PolicyDocument.policy_id,
            func.count(PolicyDocument.id),
        )
        .where(
            PolicyDocument.policy_id.in_(policy_ids),
            PolicyDocument.is_active.is_(True),
        )
        .group_by(PolicyDocument.policy_id)
    )
    return dict(result.all())


async def delete_document_chunks(db: AsyncSession, document_id: str) -> None:
    """Delete all chunks for a document."""
    await db.execute(
        delete(DocumentChunk).where(DocumentChunk.document_id == document_id)
    )
    await db.flush()


async def delete_chunks_for_policy(db: AsyncSession, policy_id: str) -> None:
    """Delete all chunks for a policy."""
    await db.execute(delete(DocumentChunk).where(DocumentChunk.policy_id == policy_id))
    await db.flush()


async def soft_delete_documents_for_policy(db: AsyncSession, policy_id: str) -> None:
    """Soft-delete all documents for a policy."""
    await db.execute(
        update(PolicyDocument)
        .where(PolicyDocument.policy_id == policy_id)
        .values(is_active=False)
    )
    await db.flush()


async def get_policy_count_for_insurer(db: AsyncSession, insurer_id: str) -> int:
    """Count active policies for an insurer."""
    result = await db.execute(
        select(func.count(Policy.id)).where(
            Policy.insurer_id == insurer_id, Policy.is_active.is_(True)
        )
    )
    return result.scalar() or 0


async def get_policy_count_for_category(db: AsyncSession, category_id: str) -> int:
    """Count active policies for an insurance category."""
    result = await db.execute(
        select(func.count(Policy.id)).where(
            Policy.insurance_category_id == category_id,
            Policy.is_active.is_(True),
        )
    )
    return result.scalar() or 0


async def update_document_file_url(
    db: AsyncSession,
    document_id: str,
    file_url: str,
) -> None:
    """Update the stored URL for a policy document."""
    await db.execute(
        update(PolicyDocument)
        .where(PolicyDocument.id == document_id)
        .values(file_url=file_url)
    )
    await db.flush()


async def insert_chunk(
    db: AsyncSession,
    policy_id: str,
    document_id: str,
    chunk_index: int,
    chunk_text: str,
    embedding: list[float],
    metadata: dict[str, Any],
) -> DocumentChunk:
    """Create and persist a document chunk."""
    chunk = DocumentChunk(
        policy_id=policy_id,
        document_id=document_id,
        chunk_index=chunk_index,
        chunk_text=chunk_text,
        embedding=embedding,
        document_metadata=metadata,
    )
    db.add(chunk)
    await db.flush()
    await db.refresh(chunk)
    return chunk
