from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.modules.businesses.service import Service as BusinessService
from app.modules.profiling.service import Service as ProfilingService


@dataclass
class RiskScoreInfo:
    category: str
    score: float
    level: str


@dataclass
class BusinessContext:
    business_id: UUID
    session_id: UUID | None
    business_name: str
    business_description: str | None
    industry: str
    segment: str
    business_size: str | None
    employee_count: int | None
    location: str | None
    risk_scores: list[RiskScoreInfo] = field(default_factory=list)


@dataclass
class PolicyInfo:
    id: str
    name: str
    insurer: str
    category: str


class BusinessContextProvider:
    """Provides business context for policy comparison.

    Currently reads from business_profiles and business_risk_scores tables.
    When the recommendation engine is completed, this provider should be
    swapped to use recommendation_service instead — the BusinessContext
    dataclass remains the same, only the fetch logic changes.
    """

    async def get_context(
        self,
        db: AsyncSession,
        business_profile_id: UUID,
        session_id: UUID | None = None,
    ) -> BusinessContext:
        profile = await BusinessService().get_business_by_id(business_profile_id, db)
        if not profile:
            raise NotFoundException("Business profile not found")

        location = None
        if profile.city or profile.state:
            location = ", ".join(filter(None, [profile.city, profile.state]))

        context = BusinessContext(
            business_id=business_profile_id,
            session_id=session_id,
            business_name=profile.business_name,
            business_description=profile.business_description,
            industry=profile.industry.name if profile.industry else "Unknown",
            segment=profile.segment.name if profile.segment else "Unknown",
            business_size=profile.annual_turnover_range,
            employee_count=profile.employee_count,
            location=location,
        )

        risk_session_id = session_id
        if not risk_session_id:
            session = await ProfilingService().get_latest_completed_session_for_business(
                business_profile_id,
                db,
            )
            risk_session_id = session.id if session else None
        if risk_session_id:
            scores = await ProfilingService().get_risk_scores_for_session(
                risk_session_id,
                db,
            )
            context.risk_scores = [
                RiskScoreInfo(
                    category=rs.risk_category.name if rs.risk_category else "Unknown",
                    score=float(rs.score),
                    level=rs.risk_level,
                )
                for rs in scores
            ]

        return context

    def format_context_for_prompt(self, ctx: BusinessContext) -> str:
        lines = [
            f"Current Business ID: {ctx.business_id}",
            f"Current Session ID: {ctx.session_id or 'Latest completed session'}",
            f"Business Name: {ctx.business_name}",
            f"Business Description: {ctx.business_description or 'Not specified'}",
            f"Industry: {ctx.industry}",
            f"Segment: {ctx.segment}",
            f"Business Size: {ctx.business_size or 'Not specified'}",
            f"Employees: {ctx.employee_count or 'Not specified'}",
            f"Location: {ctx.location or 'Not specified'}",
        ]
        if ctx.risk_scores:
            lines.append("\nRisk Scores:")
            for rs in ctx.risk_scores:
                lines.append(f"  - {rs.category}: {rs.score} ({rs.level})")
        return "\n".join(lines)


Provider = BusinessContextProvider()
