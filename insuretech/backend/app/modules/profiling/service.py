"""Business logic layer for the profiling module."""

from collections import defaultdict
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.core.logging import get_logger
from app.models import BusinessRiskScore, ProfilingSession, User
from app.modules.businesses.service import Service as BusinessService
from app.modules.profiling import repository
from app.modules.profiling.constants import (
    ANSWER_SUBMITTED_MESSAGE,
    BATCH_ANSWERS_SUBMITTED_MESSAGE,
    BUSINESS_RESULTS_FETCHED_MESSAGE,
    DEFAULT_SEGMENT,
    HIGH_RISK_LEVELS,
    LOADED_COMPLETED_SESSION_MESSAGE,
    MULTI_SELECT_DELIMITERS,
    NO_BUSINESS_PROFILE_MESSAGE,
    NO_COMPLETED_SESSION_MESSAGE,
    NO_HIGH_RISK_CATEGORIES_MESSAGE,
    PREVIEW_SCORES_COMPUTED_MESSAGE,
    PROFILING_COMPLETED_MESSAGE,
    PROFILING_SESSION_NOT_FOUND_MESSAGE,
    PROFILING_STATUS_FETCHED_MESSAGE,
    QUESTION_TYPE_MULTI_SELECT,
    RESUMED_SESSION_MESSAGE,
    RISK_LEVEL_CRITICAL,
    RISK_LEVEL_HIGH,
    RISK_LEVEL_LOW,
    RISK_LEVEL_MEDIUM,
    RISK_THRESHOLD_CRITICAL,
    RISK_THRESHOLD_HIGH,
    RISK_THRESHOLD_MEDIUM,
    SECTIONS_ORDER,
    SESSION_STARTED_MESSAGE,
    SESSION_STATE_FETCHED_MESSAGE,
    TIER2_QUESTIONS_FETCHED_MESSAGE,
    UNKNOWN_LABEL,
    UNKNOWN_LEVEL_LABEL,
    UNKNOWN_SECTION_MESSAGE_TEMPLATE,
)
from app.modules.profiling.schemas import (
    PreviewScoreOut,
    PreviewScoresOut,
    ProfilingAnswerBatchCreate,
    ProfilingAnswerCreate,
    ProfilingCompleteOut,
    ProfilingSessionOut,
    QuestionOut,
    RiskScoreOut,
    SectionQuestionsOut,
    Tier2QuestionOut,
)
from app.shared.response import APIResponse

logger = get_logger(__name__)


class _ProfilingService:
    """Service for business risk profiling operations."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_status(
        self,
        user: User,
        db: AsyncSession,
        business_id: UUID | None = None,
    ) -> APIResponse:
        """Return profiling status for the authenticated user's business."""
        try:
            if business_id:
                business = await BusinessService.get_business_by_id_for_user(
                    business_id, user, db
                )
            else:
                business = await BusinessService.get_business_by_user(user, db)
        except NotFoundException:
            return APIResponse.success_response(
                NO_BUSINESS_PROFILE_MESSAGE,
                {
                    "profiling_completed": False,
                    "has_active_session": False,
                    "session": None,
                    "latest_completed_session": None,
                },
            )

        active = await repository.get_active_session(db, business.id)
        latest_completed = await repository.get_latest_completed_session(
            db, business.id
        )
        completed = latest_completed is not None

        return APIResponse.success_response(
            PROFILING_STATUS_FETCHED_MESSAGE,
            {
                "profiling_completed": completed,
                "has_active_session": active is not None,
                "session": ProfilingSessionOut.model_validate(active).model_dump()
                if active
                else None,
                "latest_completed_session": ProfilingSessionOut.model_validate(
                    latest_completed
                ).model_dump()
                if latest_completed
                else None,
            },
        )

    async def start_session(
        self,
        user: User,
        db: AsyncSession,
        tier: int | None = None,
        business_id: UUID | None = None,
    ) -> APIResponse:
        """Start a new profiling session or resume an existing one.

        Args:
            tier: If set, filter questions by tier (1 or 2).
            business_id: Target business. Falls back to user's first business if omitted.
        """
        if business_id:
            business = await BusinessService.get_business_by_id_for_user(
                business_id, user, db
            )
        else:
            business = await BusinessService.get_business_by_user(user, db)

        active = await repository.get_active_session(db, business.id)
        if active:
            logger.info(
                "Resuming active session %s for business %s", active.id, business.id
            )
            state = await self._build_section_state(db, active, business, tier=tier)
            return APIResponse.success_response(
                RESUMED_SESSION_MESSAGE, state.model_dump()
            )

        latest_completed = await repository.get_latest_completed_session(
            db, business.id
        )
        if latest_completed:
            logger.info(
                "Reopening completed session %s for business %s",
                latest_completed.id,
                business.id,
            )
            state = await self._build_section_state(
                db,
                latest_completed,
                business,
                SECTIONS_ORDER[0],
                tier=tier,
            )
            return APIResponse.success_response(
                LOADED_COMPLETED_SESSION_MESSAGE, state.model_dump()
            )

        session = await repository.create_session(db, business.id)
        logger.info(
            "Created profiling session %s for business %s", session.id, business.id
        )

        state = await self._build_section_state(db, session, business, tier=tier)
        return APIResponse.success_response(SESSION_STARTED_MESSAGE, state.model_dump())

    async def get_session_state(
        self,
        session_id: UUID,
        user: User,
        db: AsyncSession,
        section: str | None = None,
        tier: int | None = None,
    ) -> APIResponse:
        """Fetch the full state of a profiling session.

        If ``section`` is provided the session's current section pointer
        is advanced to that section (acting as navigation).

        Args:
            tier: If set, filter questions by tier (1 or 2).
        """
        session, business = await self._resolve_session(session_id, user, db)

        target = section or session.current_section
        if target and target != session.current_section:
            updated = await repository.update_session_section(db, session.id, target)
            if updated:
                session = updated

        state = await self._build_section_state(
            db, session, business, target, tier=tier
        )
        return APIResponse.success_response(
            SESSION_STATE_FETCHED_MESSAGE, state.model_dump()
        )

    async def submit_answer(
        self,
        session_id: UUID,
        data: ProfilingAnswerCreate,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        """Save an answer and return the updated section state.

        When ``advance_to_section`` is set the session navigates to that
        section after saving the answer.
        """
        session, business = await self._resolve_session(session_id, user, db)

        await repository.save_answer(db, session.id, data)
        logger.info(
            "Answer saved for session %s, question %s", session.id, data.question_id
        )

        target = data.advance_to_section or session.current_section
        if target and target != session.current_section:
            if target not in SECTIONS_ORDER:
                raise BadRequestException(
                    UNKNOWN_SECTION_MESSAGE_TEMPLATE.format(section=target)
                )
            updated = await repository.update_session_section(db, session.id, target)
            if updated:
                session = updated

        state = await self._build_section_state(db, session, business, target)
        return APIResponse.success_response(
            ANSWER_SUBMITTED_MESSAGE, state.model_dump()
        )

    async def submit_answers_batch(
        self,
        session_id: UUID,
        data: ProfilingAnswerBatchCreate,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        """Save multiple answers in a batch."""
        session, business = await self._resolve_session(session_id, user, db)

        for ans_data in data.answers:
            await repository.save_answer(db, session.id, ans_data)

        logger.info(
            "Batch answers saved for session %s, count: %d",
            session.id,
            len(data.answers),
        )

        target = data.advance_to_section or session.current_section
        if target and target != session.current_section:
            if target not in SECTIONS_ORDER:
                raise BadRequestException(
                    UNKNOWN_SECTION_MESSAGE_TEMPLATE.format(section=target)
                )
            updated = await repository.update_session_section(db, session.id, target)
            if updated:
                session = updated

        state = await self._build_section_state(db, session, business, target)
        return APIResponse.success_response(
            BATCH_ANSWERS_SUBMITTED_MESSAGE, state.model_dump()
        )

    async def complete_session(
        self,
        session_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        """Complete a profiling session and compute risk scores."""
        session, business = await self._resolve_session(session_id, user, db)

        risk_scores = await self._compute_risk_scores(db, session, business)
        saved = await repository.save_risk_scores(db, risk_scores)

        completed = await repository.complete_session(db, session.id)
        if not completed:
            raise NotFoundException(PROFILING_SESSION_NOT_FOUND_MESSAGE)

        # Re-load saved scores with risk_category relationship loaded explicitly.
        scores = await repository.get_risk_scores_for_session(db, session.id)
        scores_out = [self._score_to_out(s) for s in scores]

        logger.info("Session %s completed with %d risk scores", session.id, len(scores))

        return APIResponse.success_response(
            PROFILING_COMPLETED_MESSAGE,
            ProfilingCompleteOut(
                session=ProfilingSessionOut.model_validate(completed),
                scores=scores_out,
            ).model_dump(),
        )

    async def preview_scores(
        self,
        session_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        """Compute and return preliminary risk scores without completing the session.

        Scores are computed in-memory and NOT persisted. Used after Tier 1
        to show the user where they stand before deciding on Tier 2 refinement.
        """
        session, business = await self._resolve_session(session_id, user, db)

        risk_scores = await self._compute_risk_scores(db, session, business)

        # Check which categories have tier-2 questions available
        high_cat_ids: list[UUID] = []
        for rs in risk_scores:
            if rs.risk_level in HIGH_RISK_LEVELS:
                high_cat_ids.append(rs.risk_category_id)

        segment_name = (
            business.segment.name.lower() if business.segment else DEFAULT_SEGMENT
        )
        tier2_available: set[UUID] = set()
        if high_cat_ids:
            t2_questions = await repository.get_tier2_questions_for_categories(
                db, segment_name, high_cat_ids
            )
            for q in t2_questions:
                for mapping in q.factor_mappings or []:
                    if mapping.risk_factor.risk_category_id in high_cat_ids:
                        tier2_available.add(mapping.risk_factor.risk_category_id)

        scores_out = []
        has_high = False
        for rs in risk_scores:
            cat_id = rs.risk_category_id
            level = rs.risk_level
            if level in HIGH_RISK_LEVELS:
                has_high = True
            scores_out.append(
                PreviewScoreOut(
                    risk_category_name=(
                        rs.risk_category.name if rs.risk_category else UNKNOWN_LABEL
                    ),
                    score=float(rs.score),
                    risk_level=level,
                    factor_breakdown=rs.factor_breakdown,
                    has_tier2_questions=cat_id in tier2_available,
                )
            )

        return APIResponse.success_response(
            PREVIEW_SCORES_COMPUTED_MESSAGE,
            PreviewScoresOut(scores=scores_out, has_high_risk=has_high).model_dump(),
        )

    async def get_tier2_questions(
        self,
        session_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        """Fetch tier 2 questions for categories that scored high/critical."""
        session, business = await self._resolve_session(session_id, user, db)

        # Check existing scores first, compute if not present
        existing = await repository.get_risk_scores_for_session(db, session.id)
        if not existing:
            risk_scores = await self._compute_risk_scores(db, session, business)
        else:
            risk_scores = existing

        high_cat_ids: list[UUID] = []
        cat_levels: dict[UUID, str] = {}
        cat_names: dict[UUID, str] = {}
        for rs in risk_scores:
            if rs.risk_level in HIGH_RISK_LEVELS:
                high_cat_ids.append(rs.risk_category_id)
                cat_levels[rs.risk_category_id] = rs.risk_level
                if rs.risk_category:
                    cat_names[rs.risk_category_id] = rs.risk_category.name

        if not high_cat_ids:
            return APIResponse.success_response(
                NO_HIGH_RISK_CATEGORIES_MESSAGE, {"questions": []}
            )

        segment_name = (
            business.segment.name.lower() if business.segment else DEFAULT_SEGMENT
        )
        questions = await repository.get_tier2_questions_for_categories(
            db, segment_name, high_cat_ids
        )
        answers = await repository.get_answers_for_session(db, session.id)
        answers_dict = {str(a.question_id): a.answer_value for a in answers}

        tier2_out = []
        for q in questions:
            for mapping in q.factor_mappings or []:
                rcat_id = mapping.risk_factor.risk_category_id
                if rcat_id in high_cat_ids:
                    tier2_out.append(
                        Tier2QuestionOut(
                            question=QuestionOut.model_validate(q),
                            risk_category_name=cat_names.get(rcat_id, UNKNOWN_LABEL),
                            factor_name=mapping.risk_factor.factor_name,
                            current_risk_level=cat_levels.get(
                                rcat_id, UNKNOWN_LEVEL_LABEL
                            ),
                            answer_value=answers_dict.get(str(q.id)),
                        )
                    )

        return APIResponse.success_response(
            TIER2_QUESTIONS_FETCHED_MESSAGE,
            {"questions": [t.model_dump() for t in tier2_out]},
        )

    async def get_business_results(
        self,
        business_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        """Return completed profiling results for a business.

        Args:
            business_id: UUID of the business profile.
            user: Authenticated user (must own the business).
            db: Database session.

        Returns:
            ProfilingCompleteOut with session + scores.

        Raises:
            NotFoundException if no completed session exists.
        """
        business = await BusinessService.get_business_by_id_for_user(
            business_id, user, db
        )

        session = await repository.get_latest_completed_session(db, business.id)
        if not session:
            raise NotFoundException(NO_COMPLETED_SESSION_MESSAGE)

        scores = await repository.get_risk_scores_for_session(db, session.id)
        scores_out = [self._score_to_out(s) for s in scores]

        return APIResponse.success_response(
            BUSINESS_RESULTS_FETCHED_MESSAGE,
            ProfilingCompleteOut(
                session=ProfilingSessionOut.model_validate(session),
                scores=scores_out,
            ).model_dump(),
        )

    async def get_latest_completed_session_for_business(
        self,
        business_id: UUID,
        db: AsyncSession,
    ) -> ProfilingSession | None:
        """Fetch the latest completed session for cross-module service use."""
        return await repository.get_latest_completed_session(db, business_id)

    async def get_risk_scores_for_session(
        self,
        session_id: UUID,
        db: AsyncSession,
    ) -> list[BusinessRiskScore]:
        """Fetch risk scores for cross-module service use."""
        return await repository.get_risk_scores_for_session(db, session_id)

    async def get_session_by_id(
        self,
        session_id: UUID,
        db: AsyncSession,
    ) -> ProfilingSession | None:
        """Fetch a profiling session by ID for cross-module service use."""
        return await repository.get_session_by_id(db, session_id)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _score_to_out(score: BusinessRiskScore) -> RiskScoreOut:
        return RiskScoreOut(
            risk_category_name=(
                score.risk_category.name if score.risk_category else UNKNOWN_LABEL
            ),
            score=float(score.score),
            risk_level=score.risk_level,
            factor_breakdown=score.factor_breakdown,
        )

    async def _resolve_session(
        self,
        session_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> tuple[ProfilingSession, object]:
        """Fetch a session and its owning business in one go.

        Verifies the user owns the business via ``business.user_id``.

        Returns:
            ``(session, business)`` where business has ``segment`` loaded.
        """
        session = await repository.get_session_by_id(db, session_id)
        if not session:
            raise NotFoundException(PROFILING_SESSION_NOT_FOUND_MESSAGE)

        business = await BusinessService.get_business_by_id_for_user(
            session.business_id, user, db
        )

        return session, business

    async def _build_section_state(
        self,
        db: AsyncSession,
        session: ProfilingSession,
        business: object,
        section: str | None = None,
        tier: int | None = None,
    ) -> SectionQuestionsOut:
        """Assemble the full state of a given wizard section.

        Args:
            tier: If set, filter questions by tier (1 or 2).
        """
        target = section or session.current_section or SECTIONS_ORDER[0]
        segment_name = (
            business.segment.name.lower() if business.segment else DEFAULT_SEGMENT
        )

        answers = await repository.get_answers_for_session(db, session.id)
        answers_dict = {str(a.question_id): a.answer_value for a in answers}

        visible = await self._get_visible_questions(db, segment_name, target, tier=tier)

        section_index = SECTIONS_ORDER.index(target) if target in SECTIONS_ORDER else 0

        return SectionQuestionsOut(
            section=target,
            section_index=section_index,
            total_sections=len(SECTIONS_ORDER),
            questions=[QuestionOut.model_validate(q) for q in visible],
            answers=answers_dict,
            session=ProfilingSessionOut.model_validate(session),
        )

    async def _get_visible_questions(
        self,
        db: AsyncSession,
        segment: str,
        section: str,
        tier: int | None = None,
    ) -> list:
        """Return all questions for a section/segment/tier.

        Frontend handles conditional visibility via is_conditional,
        parent_unified_id, and parent_answer_value.
        """
        return await repository.get_questions_by_section(
            db, segment, section, tier=tier
        )

    @staticmethod
    def _rule_matches_answer(rule, answers_dict: dict[str, str]) -> bool:
        """Check if a scoring rule's answer_value matches the user's answer.

        For single-select questions the match is exact. For multi-select the
        stored answer is a delimiter-separated list and the match succeeds if
        any element equals the rule's ``answer_value``. Both the new ``|||``
        delimiter and the legacy comma delimiter are tried.
        """
        qid = str(rule.question_id)
        user_answer = answers_dict.get(qid)
        if not user_answer:
            return False

        if rule.question.question_type == QUESTION_TYPE_MULTI_SELECT:
            for delim in MULTI_SELECT_DELIMITERS:
                parts = [p for p in user_answer.split(delim) if p]
                if rule.answer_value in parts:
                    return True
            return False

        return rule.answer_value == user_answer

    async def _compute_risk_scores(
        self,
        db: AsyncSession,
        session: ProfilingSession,
        business: object,
    ) -> list[BusinessRiskScore]:
        """Compute risk scores by evaluating answer score rules."""
        categories = await repository.get_active_risk_categories(db)
        rules = await repository.get_answer_score_rules_for_session(db, session.id)
        answers = await repository.get_answers_for_session(db, session.id)
        answers_dict = {str(a.question_id): a.answer_value for a in answers}

        # Factor ID -> list of scores from matching rules
        factor_scores: defaultdict[UUID, list[float]] = defaultdict(list)
        for rule in rules:
            if not self._rule_matches_answer(rule, answers_dict):
                continue
            factor_scores[rule.risk_factor_id].append(float(rule.score))

        # Factor ID -> average score
        factor_avg: dict[UUID, float] = {}
        for fid, scores in factor_scores.items():
            factor_avg[fid] = sum(scores) / len(scores) if scores else 0.0

        # Build category-level factor lookups
        category_factor_ids: dict[UUID, list] = {}
        factor_obj_map: dict[UUID, object] = {}
        for cat in categories:
            category_factor_ids[cat.id] = []
            for f in cat.risk_factors:
                factor_obj_map[f.id] = f
                category_factor_ids[cat.id].append(f)

        risk_score_instances: list[BusinessRiskScore] = []
        for cat in categories:
            factors = category_factor_ids.get(cat.id, [])
            matched = [f for f in factors if f.id in factor_avg]
            if not matched:
                risk_score_instances.append(
                    BusinessRiskScore(
                        business_id=business.id,
                        session_id=session.id,
                        risk_category_id=cat.id,
                        risk_category=cat,
                        score=0.0,
                        risk_level=RISK_LEVEL_LOW,
                        factor_breakdown=None,
                    )
                )
                continue

            total_weight = sum(float(f.weight) for f in matched)
            if total_weight == 0:
                continue

            weighted = sum(factor_avg[f.id] * float(f.weight) for f in matched)
            category_score = weighted / total_weight

            risk_level = RISK_LEVEL_LOW
            if category_score >= RISK_THRESHOLD_CRITICAL:
                risk_level = RISK_LEVEL_CRITICAL
            elif category_score >= RISK_THRESHOLD_HIGH:
                risk_level = RISK_LEVEL_HIGH
            elif category_score >= RISK_THRESHOLD_MEDIUM:
                risk_level = RISK_LEVEL_MEDIUM

            breakdown = {f.factor_name: factor_avg[f.id] for f in matched}

            risk_score_instances.append(
                BusinessRiskScore(
                    business_id=business.id,
                    session_id=session.id,
                    risk_category_id=cat.id,
                    risk_category=cat,
                    score=category_score,
                    risk_level=risk_level,
                    factor_breakdown=breakdown,
                )
            )

        return risk_score_instances


Service = _ProfilingService()
