"""Database access layer for the recommendations module."""

from uuid import UUID

from sqlalchemy import select, or_
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
    RiskCategory,
)


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
        .where(BusinessProfile.id == business_id, BusinessProfile.is_active == True)
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
        select(InsuranceCategory)
        .where(
            InsuranceCategory.risk_category_id.in_(risk_category_ids),
            InsuranceCategory.is_active == True,
        )
    )
    return list(result.scalars().all())


async def get_policies_for_insurance_categories(
    db: AsyncSession,
    insurance_category_ids: list[UUID],
    segment: str,
) -> list[Policy]:
    """Fetch active policies for given insurance categories, filtered by segment."""
    if not insurance_category_ids:
        return []
    result = await db.execute(
        select(Policy)
        .options(
            selectinload(Policy.insurer),
            selectinload(Policy.insurance_category),
        )
        .where(
            Policy.insurance_category_id.in_(insurance_category_ids),
            Policy.is_active == True,
            or_(
                Policy.target_segment.is_(None),
                Policy.target_segment == segment,
                Policy.target_segment == "both",
            ),
        )
        .order_by(Policy.policy_name)
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
            PolicyDocument.is_active == True,
        )
        .order_by(PolicyDocument.policy_id, PolicyDocument.version.desc())
    )
    return list(result.scalars().all())


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
        .where(DocumentChunk.policy_id.in_(policy_ids))
        .order_by(DocumentChunk.policy_id, DocumentChunk.chunk_index)
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
            Recommendation.is_active == True,
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
