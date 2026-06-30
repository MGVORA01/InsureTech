"""Business logic layer for the profiling module."""

from collections import defaultdict
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.core.logging import get_logger
from app.models import BusinessRiskScore, ProfilingSession, User
from app.modules.businesses.service import Service as BusinessService
from app.modules.profiling import repository
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

    async def get_status(self, user: User, db: AsyncSession) -> APIResponse:
        """Return profiling status for the authenticated user's business."""
        try:
            business = await BusinessService.get_business_by_user(user, db)
        except NotFoundException:
            return APIResponse.success_response(
                "No business profile found",
                {
                    "profiling_completed": False,
                    "has_active_session": False,
                    "session": None,
                },
            )

        active = await repository.get_active_session(db, business.id)
        completed = await repository.has_completed_session(db, business.id)

        return APIResponse.success_response(
            "Profiling status fetched successfully",
            {
                "profiling_completed": completed,
                "has_active_session": active is not None,
                "session": ProfilingSessionOut.model_validate(active).model_dump()
                if active
                else None,
            },
        )

    async def start_session(self, user: User, db: AsyncSession, tier: int | None = None) -> APIResponse:
        """Start a new profiling session or resume an existing one.

        Args:
            tier: If set, filter questions by tier (1 or 2).
        """
        business = await BusinessService.get_business_by_user(user, db)

        active = await repository.get_active_session(db, business.id)
        if active:
            logger.info("Resuming active session %s for business %s", active.id, business.id)
            state = await self._build_section_state(db, active, business, tier=tier)
            return APIResponse.success_response(
                "Resumed active profiling session", state.model_dump()
            )

        session = await repository.create_session(db, business.id)
        await db.commit()
        logger.info("Created profiling session %s for business %s", session.id, business.id)

        state = await self._build_section_state(db, session, business, tier=tier)
        return APIResponse.success_response(
            "Profiling session started successfully", state.model_dump()
        )

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

        state = await self._build_section_state(db, session, business, target, tier=tier)
        return APIResponse.success_response(
            "Session state fetched successfully", state.model_dump()
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
        logger.info("Answer saved for session %s, question %s", session.id, data.question_id)

        target = data.advance_to_section or session.current_section
        if target and target != session.current_section:
            if target not in repository.SECTIONS_ORDER:
                raise BadRequestException(f"Unknown section: {target}")
            updated = await repository.update_session_section(db, session.id, target)
            if updated:
                session = updated

        await db.commit()
        state = await self._build_section_state(db, session, business, target)
        return APIResponse.success_response(
            "Answer submitted successfully", state.model_dump()
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
            
        logger.info("Batch answers saved for session %s, count: %d", session.id, len(data.answers))

        target = data.advance_to_section or session.current_section
        if target and target != session.current_section:
            if target not in repository.SECTIONS_ORDER:
                raise BadRequestException(f"Unknown section: {target}")
            updated = await repository.update_session_section(db, session.id, target)
            if updated:
                session = updated

        await db.commit()
        state = await self._build_section_state(db, session, business, target)
        return APIResponse.success_response(
            "Batch answers submitted successfully", state.model_dump()
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
            raise NotFoundException("Profiling session not found")

        await db.commit()
        logger.info("Session %s completed with %d risk scores", session.id, len(saved))

        return APIResponse.success_response(
            "Profiling completed successfully",
            ProfilingCompleteOut(
                session=ProfilingSessionOut.model_validate(completed),
                scores=[self._score_to_out(s) for s in saved],
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
            if rs.risk_level in ("high", "critical"):
                high_cat_ids.append(rs.risk_category_id)

        segment_name = business.segment.name.lower() if business.segment else "both"
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
            if level in ("high", "critical"):
                has_high = True
            scores_out.append(
                PreviewScoreOut(
                    risk_category_name=(
                        rs.risk_category.name if rs.risk_category else "Unknown"
                    ),
                    score=float(rs.score),
                    risk_level=level,
                    factor_breakdown=rs.factor_breakdown,
                    has_tier2_questions=cat_id in tier2_available,
                )
            )

        return APIResponse.success_response(
            "Preview scores computed",
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
            if rs.risk_level in ("high", "critical"):
                high_cat_ids.append(rs.risk_category_id)
                cat_levels[rs.risk_category_id] = rs.risk_level
                if rs.risk_category:
                    cat_names[rs.risk_category_id] = rs.risk_category.name

        if not high_cat_ids:
            return APIResponse.success_response(
                "No high-risk categories found", {"questions": []}
            )

        segment_name = business.segment.name.lower() if business.segment else "both"
        questions = await repository.get_tier2_questions_for_categories(
            db, segment_name, high_cat_ids
        )

        tier2_out = []
        for q in questions:
            for mapping in q.factor_mappings or []:
                rcat_id = mapping.risk_factor.risk_category_id
                if rcat_id in high_cat_ids:
                    tier2_out.append(
                        Tier2QuestionOut(
                            question=QuestionOut.model_validate(q),
                            risk_category_name=cat_names.get(rcat_id, "Unknown"),
                            factor_name=mapping.risk_factor.factor_name,
                            current_risk_level=cat_levels.get(rcat_id, "unknown"),
                        )
                    )

        return APIResponse.success_response(
            "Tier 2 questions fetched",
            {"questions": [t.model_dump() for t in tier2_out]},
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _score_to_out(score: BusinessRiskScore) -> RiskScoreOut:
        return RiskScoreOut(
            risk_category_name=(
                score.risk_category.name if score.risk_category else "Unknown"
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

        Returns:
            ``(session, business)`` where business has ``segment`` loaded.
        """
        session = await repository.get_session_by_id(db, session_id)
        if not session:
            raise NotFoundException("Profiling session not found")

        business = await BusinessService.get_business_by_user(user, db)
        if session.business_id != business.id:
            raise NotFoundException("Profiling session not found")

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
        target = section or session.current_section or repository.SECTIONS_ORDER[0]
        segment_name = business.segment.name.lower() if business.segment else "both"

        answers = await repository.get_answers_for_session(db, session.id)
        answers_dict = {str(a.question_id): a.answer_value for a in answers}

        visible = await self._get_visible_questions(db, segment_name, target, answers_dict, tier=tier)

        section_index = (
            repository.SECTIONS_ORDER.index(target)
            if target in repository.SECTIONS_ORDER
            else 0
        )

        return SectionQuestionsOut(
            section=target,
            section_index=section_index,
            total_sections=len(repository.SECTIONS_ORDER),
            questions=[QuestionOut.model_validate(q) for q in visible],
            answers=answers_dict,
            session=ProfilingSessionOut.model_validate(session),
        )

    async def _get_visible_questions(
        self,
        db: AsyncSession,
        segment: str,
        section: str,
        answers_dict: dict[str, str],
        tier: int | None = None,
    ) -> list:
        """Resolve the full visible question tree for a section.

        Fetches top-level and conditional questions in two queries, then
        resolves conditional chains in memory (BFS).

        Args:
            tier: If set, only return questions of this tier.
        """
        top_level = await repository.get_questions_by_section(db, segment, section, tier=tier)
        all_conditional = await repository.get_conditional_questions_for_section(
            db, segment, section
        )

        # (parent_question_id, parent_answer_value) -> [child, ...]
        lookup: defaultdict[tuple[str, str], list] = defaultdict(list)
        for cq in all_conditional:
            lookup[(str(cq.parent_question_id), cq.parent_answer_value)].append(cq)

        visible = list(top_level)
        queue = list(top_level)
        seen = {q.id for q in visible}

        while queue:
            q = queue.pop(0)
            qid = str(q.id)
            answer_val = answers_dict.get(qid)
            if answer_val is None:
                continue
            children = lookup.get((qid, answer_val), [])
            for child in children:
                if child.id not in seen:
                    seen.add(child.id)
                    visible.append(child)
                    queue.append(child)

        return visible

    async def _compute_risk_scores(
        self,
        db: AsyncSession,
        session: ProfilingSession,
        business: object,
    ) -> list[BusinessRiskScore]:
        """Compute risk scores by evaluating answer score rules."""
        categories = await repository.get_active_risk_categories(db)
        rules = await repository.get_answer_score_rules_for_session(db, session.id)

        # Factor ID -> list of scores from matching rules
        factor_scores: defaultdict[UUID, list[float]] = defaultdict(list)
        for rule in rules:
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
                continue

            total_weight = sum(float(f.weight) for f in matched)
            if total_weight == 0:
                continue

            weighted = sum(factor_avg[f.id] * float(f.weight) for f in matched)
            category_score = weighted / total_weight

            risk_level = "low"
            if category_score >= 0.8:
                risk_level = "critical"
            elif category_score >= 0.6:
                risk_level = "high"
            elif category_score >= 0.3:
                risk_level = "medium"

            breakdown = {f.factor_name: factor_avg[f.id] for f in matched}

            risk_score_instances.append(
                BusinessRiskScore(
                    business_id=business.id,
                    session_id=session.id,
                    risk_category_id=cat.id,
                    score=category_score,
                    risk_level=risk_level,
                    factor_breakdown=breakdown,
                )
            )

        return risk_score_instances


Service = _ProfilingService()
