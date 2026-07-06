"""Database access layer for the profiling module."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import and_, or_, select
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
from app.modules.profiling.constants import (
    DEFAULT_SECTION,
    DEFAULT_SEGMENT,
    SESSION_STATUS_COMPLETED,
    SESSION_STATUS_IN_PROGRESS,
)
from app.shared import base_repository as Base


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
        Question.is_active.is_(True),
        or_(
            Question.applicable_segment == DEFAULT_SEGMENT,
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
    return await Base.exists(
        db, ProfilingSession, business_id=business_id, status=SESSION_STATUS_COMPLETED
    )


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
            Question.is_active.is_(True),
            Question.is_conditional.is_(True),
            Question.parent_question_id.isnot(None),
            or_(
                Question.applicable_segment == DEFAULT_SEGMENT,
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
            Question.is_active.is_(True),
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
    return await Base.create(
        db,
        ProfilingSession,
        business_id=business_id,
        status=SESSION_STATUS_IN_PROGRESS,
        current_section=DEFAULT_SECTION,
    )


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
            ProfilingSession.status == SESSION_STATUS_IN_PROGRESS,
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
    return await Base.get_by_id(db, ProfilingSession, session_id)


async def save_answer(
    db: AsyncSession,
    session_id: UUID,
    question_id: UUID,
    answer_value: str,
) -> ProfilingAnswer:
    """Create or update an answer for a session+question pair.

    If an answer already exists for the same session and question the
    value is updated in-place.  Otherwise a new ProfilingAnswer is created.

    Args:
        session_id: UUID of the profiling session.
        question_id: UUID of the question being answered.
        answer_value: The raw answer value as a string.

    Returns:
        The created or updated ProfilingAnswer ORM instance.
    """
    result = await db.execute(
        select(ProfilingAnswer).where(
            ProfilingAnswer.session_id == session_id,
            ProfilingAnswer.question_id == question_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.answer_value = answer_value
    else:
        existing = ProfilingAnswer(
            session_id=session_id,
            question_id=question_id,
            answer_value=answer_value,
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
        .where(RiskCategory.is_active.is_(True))
        .order_by(RiskCategory.name)
    )
    return list(result.scalars().all())


async def get_latest_completed_session(
    db: AsyncSession,
    business_id: UUID,
) -> ProfilingSession | None:
    """Fetch the most recently completed profiling session for a business.

    Args:
        business_id: UUID of the business profile.

    Returns:
        The latest completed ProfilingSession if found, None otherwise.
    """
    result = await db.execute(
        select(ProfilingSession)
        .where(
            ProfilingSession.business_id == business_id,
            ProfilingSession.status == SESSION_STATUS_COMPLETED,
        )
        .order_by(ProfilingSession.completed_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


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
            AnswerScoreRule.is_active.is_(True),
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
        session.status = SESSION_STATUS_COMPLETED
        session.completed_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(session)

    return session


async def save_risk_scores(
    db: AsyncSession,
    risk_scores: list[BusinessRiskScore],
) -> list[BusinessRiskScore]:
    """Create or update risk score records for a session.

    Args:
        risk_scores: List of BusinessRiskScore ORM instances to persist.

    Returns:
        The persisted list of BusinessRiskScore instances.
    """
    if not risk_scores:
        return []

    pairs = [(s.session_id, s.risk_category_id) for s in risk_scores]
    existing_result = await db.execute(
        select(BusinessRiskScore).where(
            or_(
                *(
                    and_(
                        BusinessRiskScore.session_id == sid,
                        BusinessRiskScore.risk_category_id == rcid,
                    )
                    for sid, rcid in pairs
                )
            )
        )
    )
    existing_map = {
        (r.session_id, r.risk_category_id): r
        for r in existing_result.scalars().all()
    }

    saved: list[BusinessRiskScore] = []
    for score in risk_scores:
        key = (score.session_id, score.risk_category_id)
        existing = existing_map.get(key)
        if existing:
            existing.business_id = score.business_id
            existing.score = score.score
            existing.risk_level = score.risk_level
            existing.factor_breakdown = score.factor_breakdown
            existing.risk_category = score.risk_category
            saved.append(existing)
        else:
            db.add(score)
            saved.append(score)
    await db.flush()
    return saved


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
    subq = (
        select(QuestionFactorMapping.question_id)
        .join(QuestionFactorMapping.risk_factor)
        .where(RiskFactor.risk_category_id.in_(category_ids))
        .distinct()
        .subquery()
    )

    result = await db.execute(
        select(Question)
        .options(
            selectinload(Question.factor_mappings).selectinload(
                QuestionFactorMapping.risk_factor
            ),
        )
        .where(
            Question.id.in_(select(subq.c.question_id)),
            Question.tier == 2,
            Question.is_active.is_(True),
            or_(
                Question.applicable_segment == DEFAULT_SEGMENT,
                Question.applicable_segment == segment,
            ),
        )
        .order_by(Question.section, Question.order_index)
    )
    return list(result.scalars().all())
