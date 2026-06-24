"""Database access layer for the profiling module."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, or_, select
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
) -> list[Question]:
    """Fetch active top-level questions for a given section and segment.

    Only returns non-conditional questions whose ``applicable_segment``
    matches the provided segment or is ``'both'``.

    Args:
        segment: Lowercase segment name (e.g. ``'manufacturing'``).
        section: The wizard section to filter by.

    Returns:
        List of matching Question ORM instances ordered by ``order_index``.
    """
    result = await db.execute(
        select(Question)
        .where(
            Question.section == section,
            Question.is_active == True,
            Question.is_conditional == False,
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
    await db.commit()
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

    await db.commit()
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
        .scalar_subquery()
    )

    result = await db.execute(
        select(AnswerScoreRule)
        .options(
            selectinload(AnswerScoreRule.question),
            selectinload(AnswerScoreRule.risk_factor),
        )
        .where(
            AnswerScoreRule.question_id.in_(select(answered_qids)),
            AnswerScoreRule.is_active == True,
        )
    )
    return list(result.scalars().all())


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
        await db.commit()
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
    await db.commit()
    for score in risk_scores:
        await db.refresh(score)
    return risk_scores
