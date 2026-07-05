"""Route definitions for the profiling module."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.models import User
from app.modules.profiling.constants import (
    BUSINESS_RESULTS_ROUTE,
    PROFILING_PREFIX,
    PROFILING_TAG,
    SESSION_ANSWER_ROUTE,
    SESSION_ANSWERS_BATCH_ROUTE,
    SESSION_COMPLETE_ROUTE,
    SESSION_PREVIEW_SCORES_ROUTE,
    SESSION_ROUTE,
    SESSION_TIER2_QUESTIONS_ROUTE,
    START_ROUTE,
    STATUS_ROUTE,
)
from app.modules.profiling.schemas import (
    ProfilingAnswerCreate,
    ProfilingAnswerBatchCreate,
)
from app.modules.profiling.service import Service
from app.shared.dependency.get_current_user import get_current_user
from app.shared.response import APIResponse

router = APIRouter(
    prefix=PROFILING_PREFIX,
    tags=[PROFILING_TAG],
)


@router.get(STATUS_ROUTE, status_code=status.HTTP_200_OK)
async def get_profiling_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    business_id: Annotated[UUID | None, Query()] = None,
) -> APIResponse:
    """Return profiling status for a business.

    Omit ``business_id`` to use the user's first business profile.
    """
    return await Service.get_status(current_user, db, business_id=business_id)


@router.post(START_ROUTE, status_code=status.HTTP_200_OK)
async def start_profiling(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    tier: Annotated[int | None, Query()] = None,
    business_id: Annotated[UUID | None, Query()] = None,
) -> APIResponse:
    """Start a new profiling wizard session or resume an active one.

    Omit ``business_id`` to target the user's first business profile.
    Use ``?tier=1`` for core assessment questions (default).
    Use ``?tier=2`` for precision refinement questions.
    """
    return await Service.start_session(
        current_user, db, tier=tier, business_id=business_id
    )


@router.get(SESSION_ROUTE, status_code=status.HTTP_200_OK)
async def get_session_state(
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    section: Annotated[str | None, Query()] = None,
    tier: Annotated[int | None, Query()] = None,
) -> APIResponse:
    """Fetch the full state of a profiling session.

    Optionally specify ``section`` to navigate to that wizard step.
    Use ``?tier=1`` or ``?tier=2`` to filter questions by tier.
    """
    return await Service.get_session_state(
        session_id, current_user, db, section, tier=tier
    )


@router.post(SESSION_ANSWER_ROUTE, status_code=status.HTTP_200_OK)
async def submit_answer(
    session_id: UUID,
    data: ProfilingAnswerCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Submit an answer and return the updated section.

    Include ``advance_to_section`` in the body to navigate forward.
    """
    return await Service.submit_answer(session_id, data, current_user, db)


@router.post(SESSION_ANSWERS_BATCH_ROUTE, status_code=status.HTTP_200_OK)
async def submit_answers_batch(
    session_id: UUID,
    data: ProfilingAnswerBatchCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Submit multiple answers in a batch."""
    return await Service.submit_answers_batch(session_id, data, current_user, db)


@router.post(SESSION_PREVIEW_SCORES_ROUTE, status_code=status.HTTP_200_OK)
async def preview_scores(
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Compute and return preliminary risk scores without completing the session.

    Used after Tier 1 to show the user where they stand.
    Scores are NOT persisted.
    """
    return await Service.preview_scores(session_id, current_user, db)


@router.get(BUSINESS_RESULTS_ROUTE, status_code=status.HTTP_200_OK)
async def get_business_results(
    business_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Return completed profiling results for a business.

    Returns session info + scores. Returns 404 if no completed
    profiling session exists for this business.
    """
    return await Service.get_business_results(business_id, current_user, db)


@router.post(SESSION_TIER2_QUESTIONS_ROUTE, status_code=status.HTTP_200_OK)
async def get_tier2_questions(
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Fetch Tier 2 refinement questions for high-risk categories.

    Returns questions only for categories that scored high/critical.
    """
    return await Service.get_tier2_questions(session_id, current_user, db)


@router.post(SESSION_COMPLETE_ROUTE, status_code=status.HTTP_200_OK)
async def complete_session(
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    """Complete the profiling session and compute risk scores."""
    return await Service.complete_session(session_id, current_user, db)
