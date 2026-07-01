"""Database access layer for the profiling module."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, or_, select, and_
from sqlalchemy.orm import contains_eager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    AnswerScoreRule,
    BusinessRiskScore,
    ProfilingAnswer,
    ProfilingSession,
    Question,
    QuestionFactorMapping,
    RiskCategory,
    RiskFactor,
)
from app.modules.profiling.schemas import ProfilingAnswerCreate

SECTIONS_ORDER: list[str] = [
    "business_profile",
    "premises_building",
    "assets_stock",
    "machinery_operations",
    "safety_security",
    "claims_history",
    "transit_logistics",
    "coverage_structure",
]


async def get_questions_by_section(
    db: AsyncSession,
    segment: str,
    section: str,
    tier: int | None = None,
) -> list[Question]:
    """Fetch active questions for a given section and segment.

    Includes both root and conditional questions. Frontend handles
    conditional visibility. ``applicable_segment`` must match the
    provided segment or be ``'both'``.

    Args:
        segment: Lowercase segment name (e.g. ``'manufacturing'``).
        section: The wizard section to filter by.
        tier: Optional tier filter (1 or 2).

    Returns:
        List of matching Question ORM instances ordered by ``order_index``.
    """
    conditions = [
        Question.section == section,
        Question.is_active == True,
        or_(
            Question.applicable_segment == "both",
            Question.applicable_segment == segment,
        ),
    ]
    if tier is not None:
        conditions.append(Question.tier == tier)

    result = await db.execute(
        select(Question).where(and_(*conditions)).order_by(Question.order_index)
    )
    return list(result.scalars().all())


async def has_completed_session(
    db: AsyncSession,
    business_id: UUID,
) -> bool:
    """Check whether a business has at least one completed profiling session.

    Args:
        business_id: UUID of the business profile.

    Returns:
        True if a completed session exists, False otherwise.
    """
    result = await db.execute(
        select(ProfilingSession.id)
        .where(
            ProfilingSession.business_id == business_id,
            ProfilingSession.status == "completed",
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def get_conditional_questions_for_section(
    db: AsyncSession,
    segment: str,
    section: str,
) -> list[Question]:
    """Fetch ALL active conditional questions for a given section/segment.

    Used by the service layer to resolve conditional chains without N+1
    queries.

    Args:
        segment: Lowercase segment name (e.g. ``'manufacturing'``).
        section: The wizard section.

    Returns:
        List of conditional Question ORM instances ordered by ``order_index``.
    """
    result = await db.execute(
        select(Question)
        .where(
            Question.section == section,
            Question.is_active == True,
            Question.is_conditional == True,
            Question.parent_question_id.isnot(None),
            or_(
                Question.applicable_segment == "both",
                Question.applicable_segment == segment,
            ),
        )
        .order_by(Question.order_index)
    )
    return list(result.scalars().all())


async def get_conditional_questions(
    db: AsyncSession,
    parent_question_id: UUID,
    parent_answer_value: str,
) -> list[Question]:
    """Fetch child questions conditioned on a specific parent answer.

    Args:
        parent_question_id: UUID of the parent question.
        parent_answer_value: The answer value that triggers these children.

    Returns:
        List of matching Question ORM instances ordered by ``order_index``.
    """
    result = await db.execute(
        select(Question)
        .where(
            Question.parent_question_id == parent_question_id,
            Question.parent_answer_value == parent_answer_value,
            Question.is_active == True,
        )
        .order_by(Question.order_index)
    )
    return list(result.scalars().all())


async def create_session(
    db: AsyncSession,
    business_id: UUID,
) -> ProfilingSession:
    """Create a new in-progress profiling session.

    Args:
        business_id: UUID of the owning business profile.

    Returns:
        The newly created ProfilingSession ORM instance.
    """
    session = ProfilingSession(
        business_id=business_id,
        status="in_progress",
        current_section="business_profile",
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


async def get_active_session(
    db: AsyncSession,
    business_id: UUID,
) -> ProfilingSession | None:
    """Fetch the latest in-progress session for a business.

    Args:
        business_id: UUID of the business profile.

    Returns:
        Active ProfilingSession if found, None otherwise.
    """
    result = await db.execute(
        select(ProfilingSession)
        .where(
            ProfilingSession.business_id == business_id,
            ProfilingSession.status == "in_progress",
        )
        .order_by(ProfilingSession.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_session_by_id(
    db: AsyncSession,
    session_id: UUID,
) -> ProfilingSession | None:
    """Fetch a profiling session by its ID.

    Args:
        session_id: UUID of the session.

    Returns:
        ProfilingSession if found, None otherwise.
    """
    result = await db.execute(
        select(ProfilingSession).where(ProfilingSession.id == session_id)
    )
    return result.scalar_one_or_none()


async def save_answer(
    db: AsyncSession,
    session_id: UUID,
    data: ProfilingAnswerCreate,
) -> ProfilingAnswer:
    """Create or update an answer for a session+question pair.

    If an answer already exists for the same session and question the
    value is updated in-place.  Otherwise a new ProfilingAnswer is created.

    Args:
        session_id: UUID of the profiling session.
        data: The validated answer payload.

    Returns:
        The created or updated ProfilingAnswer ORM instance.
    """
    result = await db.execute(
        select(ProfilingAnswer).where(
            ProfilingAnswer.session_id == session_id,
            ProfilingAnswer.question_id == data.question_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.answer_value = data.answer_value
    else:
        existing = ProfilingAnswer(
            session_id=session_id,
            question_id=data.question_id,
            answer_value=data.answer_value,
        )
        db.add(existing)

    await db.flush()
    await db.refresh(existing)
    return existing


async def get_answers_for_session(
    db: AsyncSession,
    session_id: UUID,
) -> list[ProfilingAnswer]:
    """Fetch all answers submitted for a given session.

    Args:
        session_id: UUID of the profiling session.

    Returns:
        List of ProfilingAnswer ORM instances.
    """
    result = await db.execute(
        select(ProfilingAnswer)
        .where(ProfilingAnswer.session_id == session_id)
        .order_by(ProfilingAnswer.created_at)
    )
    return list(result.scalars().all())


async def get_active_risk_categories(db: AsyncSession) -> list[RiskCategory]:
    """Fetch all active risk categories with their risk factors eagerly loaded.

    Returns:
        List of RiskCategory ORM instances, each with ``.risk_factors`` populated.
    """
    result = await db.execute(
        select(RiskCategory)
        .options(selectinload(RiskCategory.risk_factors))
        .where(RiskCategory.is_active == True)
        .order_by(RiskCategory.name)
    )
    return list(result.scalars().all())


async def get_answer_score_rules_for_session(
    db: AsyncSession,
    session_id: UUID,
) -> list[AnswerScoreRule]:
    """Fetch active scoring rules for questions that have been answered in a session.

    Args:
        session_id: UUID of the profiling session.

    Returns:
        List of matching AnswerScoreRule ORM instances with question and
        risk_factor eagerly loaded.
    """
    answered_qids = (
        select(ProfilingAnswer.question_id)
        .distinct()
        .where(ProfilingAnswer.session_id == session_id)
    )

    result = await db.execute(
        select(AnswerScoreRule)
        .options(
            selectinload(AnswerScoreRule.question),
            selectinload(AnswerScoreRule.risk_factor),
        )
        .where(
            AnswerScoreRule.question_id.in_(answered_qids),
            AnswerScoreRule.is_active == True,
        )
    )
    return list(result.scalars().all())


async def update_session_section(
    db: AsyncSession,
    session_id: UUID,
    section: str,
) -> ProfilingSession | None:
    """Update the current section of a profiling session.

    Args:
        session_id: UUID of the session.
        section: The new section name to set.

    Returns:
        The updated ProfilingSession if found, None otherwise.
    """
    result = await db.execute(
        select(ProfilingSession).where(ProfilingSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if session:
        session.current_section = section
        await db.flush()
        await db.refresh(session)

    return session


async def complete_session(
    db: AsyncSession,
    session_id: UUID,
) -> ProfilingSession | None:
    """Mark a profiling session as completed.

    Sets ``status`` to ``'completed'`` and ``completed_at`` to the current
    timestamp.

    Args:
        session_id: UUID of the session to complete.

    Returns:
        The updated ProfilingSession if found, None otherwise.
    """
    result = await db.execute(
        select(ProfilingSession).where(ProfilingSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if session:
        session.status = "completed"
        session.completed_at = datetime.now()
        await db.flush()
        await db.refresh(session)

    return session


async def save_risk_scores(
    db: AsyncSession,
    risk_scores: list[BusinessRiskScore],
) -> list[BusinessRiskScore]:
    """Bulk-insert business risk score records.

    Args:
        risk_scores: List of BusinessRiskScore ORM instances to persist.

    Returns:
        The persisted list of BusinessRiskScore instances.
    """
    for score in risk_scores:
        db.add(score)
    await db.flush()
    for score in risk_scores:
        await db.refresh(score)
    return risk_scores


async def get_risk_scores_for_session(
    db: AsyncSession,
    session_id: UUID,
) -> list[BusinessRiskScore]:
    """Fetch computed risk scores for a given session.

    Args:
        session_id: UUID of the profiling session.

    Returns:
        List of BusinessRiskScore instances with risk_category loaded.
    """
    result = await db.execute(
        select(BusinessRiskScore)
        .options(selectinload(BusinessRiskScore.risk_category))
        .where(BusinessRiskScore.session_id == session_id)
    )
    return list(result.scalars().all())


async def get_tier2_questions_for_categories(
    db: AsyncSession,
    segment: str,
    category_ids: list[UUID],
) -> list[Question]:
    """Fetch tier 2 questions that map to the given risk categories.

    Args:
        segment: Lowercase segment name.
        category_ids: List of risk category UUIDs that scored high/critical.

    Returns:
        List of tier 2 Question instances.
    """
    result = await db.execute(
        select(Question)
        .distinct()
        .join(Question.factor_mappings)
        .join(QuestionFactorMapping.risk_factor)
        .options(
            contains_eager(Question.factor_mappings).contains_eager(QuestionFactorMapping.risk_factor),
        )
        .where(
            Question.tier == 2,
            Question.is_active == True,
            RiskFactor.risk_category_id.in_(category_ids),
            or_(
                Question.applicable_segment == "both",
                Question.applicable_segment == segment,
            ),
        )
        .order_by(Question.section, Question.order_index)
    )
    return list(result.scalars().all())
