"""Database access layer for the recommendations module."""

from uuid import UUID

from sqlalchemy import select, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    BusinessProfile,
    BusinessRiskScore,
    DocumentChunk,
    InsuranceCategory,
    Policy,
    PolicyDocument,
    Recommendation,
)
from app.modules.recommendations.constants import DEFAULT_SEGMENT
from app.shared import base_repository as Base


async def commit(db: AsyncSession) -> None:
    """Commit the current transaction on the session."""
    await Base.commit(db)


async def get_business_risk_scores(
    db: AsyncSession,
    session_id: UUID,
) -> list[BusinessRiskScore]:
    """Fetch risk scores for a session with risk_category loaded."""
    result = await db.execute(
        select(BusinessRiskScore)
        .options(selectinload(BusinessRiskScore.risk_category))
        .where(BusinessRiskScore.session_id == session_id)
    )
    return list(result.scalars().all())


async def get_business_by_session(
    db: AsyncSession,
    business_id: UUID,
) -> BusinessProfile | None:
    """Fetch business profile with segment loaded."""
    result = await db.execute(
        select(BusinessProfile)
        .options(selectinload(BusinessProfile.segment))
        .where(BusinessProfile.id == business_id, BusinessProfile.is_active.is_(True))
    )
    return result.scalar_one_or_none()


async def get_insurance_categories_for_risk_categories(
    db: AsyncSession,
    risk_category_ids: list[UUID],
) -> list[InsuranceCategory]:
    """Fetch active insurance categories linked to given risk categories."""
    if not risk_category_ids:
        return []
    result = await db.execute(
        select(InsuranceCategory).where(
            InsuranceCategory.risk_category_id.in_(risk_category_ids),
            InsuranceCategory.is_active.is_(True),
        )
    )
    return list(result.scalars().all())


async def get_policy_documents(
    db: AsyncSession,
    policy_ids: list[UUID],
) -> list[PolicyDocument]:
    """Fetch latest active policy documents for given policies."""
    if not policy_ids:
        return []
    result = await db.execute(
        select(PolicyDocument)
        .where(
            PolicyDocument.policy_id.in_(policy_ids),
            PolicyDocument.is_active.is_(True),
        )
        .order_by(PolicyDocument.policy_id, PolicyDocument.version.desc())
    )
    return list(result.scalars().all())


async def get_latest_active_policy_document(
    db: AsyncSession,
    policy_id: UUID,
) -> PolicyDocument | None:
    """Fetch the latest active document for a policy."""
    result = await db.execute(
        select(PolicyDocument)
        .where(
            PolicyDocument.policy_id == policy_id,
            PolicyDocument.is_active.is_(True),
        )
        .order_by(PolicyDocument.version.desc(), PolicyDocument.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_document_chunks_for_policies(
    db: AsyncSession,
    policy_ids: list[UUID],
    limit: int = 3,
) -> list[DocumentChunk]:
    """Fetch recent document chunks for given policies."""
    if not policy_ids:
        return []
    result = await db.execute(
        select(DocumentChunk)
        .options(selectinload(DocumentChunk.document))
        .where(DocumentChunk.policy_id.in_(policy_ids))
        .order_by(DocumentChunk.policy_id, DocumentChunk.chunk_index)
    )
    return list(result.scalars().all())


async def get_candidate_chunks_for_risk_categories(
    db: AsyncSession,
    risk_category_ids: list[UUID],
    segment: str,
    text_patterns: list[str],
    limit: int = 500,
) -> list[DocumentChunk]:
    """Fetch chunks connected to high-risk categories or matching risk language."""
    if not risk_category_ids and not text_patterns:
        return []

    filters = []
    if risk_category_ids:
        filters.append(InsuranceCategory.risk_category_id.in_(risk_category_ids))
    for pattern in text_patterns:
        filters.append(DocumentChunk.chunk_text.ilike(f"%{pattern}%"))
        filters.append(
            DocumentChunk.document_metadata["section_name"].astext.ilike(f"%{pattern}%")
        )
        filters.append(
            DocumentChunk.document_metadata["insurance_category"].astext.ilike(
                f"%{pattern}%"
            )
        )

    result = await db.execute(
        select(DocumentChunk)
        .join(DocumentChunk.policy)
        .join(Policy.insurance_category)
        .options(
            selectinload(DocumentChunk.policy).selectinload(Policy.insurer),
            selectinload(DocumentChunk.policy)
            .selectinload(Policy.insurance_category)
            .selectinload(InsuranceCategory.risk_category),
            selectinload(DocumentChunk.document),
        )
        .where(
            Policy.is_active.is_(True),
            or_(
                Policy.target_segment.is_(None),
                Policy.target_segment == segment,
                Policy.target_segment == DEFAULT_SEGMENT,
            ),
            or_(*filters),
        )
        .order_by(DocumentChunk.policy_id, DocumentChunk.chunk_index)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_policies_by_ids(
    db: AsyncSession,
    policy_ids: list[UUID],
) -> list[Policy]:
    """Fetch exact active policies by id with display relationships loaded."""
    if not policy_ids:
        return []
    result = await db.execute(
        select(Policy)
        .options(
            selectinload(Policy.insurer),
            selectinload(Policy.insurance_category).selectinload(
                InsuranceCategory.risk_category
            ),
        )
        .where(
            Policy.id.in_(policy_ids),
            Policy.is_active.is_(True),
        )
    )
    return list(result.scalars().all())


async def get_existing_recommendations(
    db: AsyncSession,
    session_id: UUID,
) -> list[Recommendation]:
    """Fetch existing recommendations for a session with related data."""
    result = await db.execute(
        select(Recommendation)
        .options(
            selectinload(Recommendation.risk_category),
            selectinload(Recommendation.insurance_category),
        )
        .where(
            Recommendation.session_id == session_id,
            Recommendation.is_active.is_(True),
        )
        .order_by(Recommendation.priority, Recommendation.risk_score.desc())
    )
    return list(result.scalars().all())


async def save_recommendations(
    db: AsyncSession,
    recommendations: list[Recommendation],
) -> list[Recommendation]:
    """Bulk-save recommendation records."""
    for rec in recommendations:
        db.add(rec)
    await db.flush()
    for rec in recommendations:
        await db.refresh(rec)
    return recommendations


async def deactivate_recommendations_for_session(
    db: AsyncSession,
    session_id: UUID,
) -> None:
    """Deactivate previously generated recommendations for a session."""
    await db.execute(
        update(Recommendation)
        .where(
            Recommendation.session_id == session_id,
            Recommendation.is_active.is_(True),
        )
        .values(is_active=False)
    )
    await db.flush()
