from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.modules.businesses.repository import get_business_by_id
from app.modules.profiling.repository import get_latest_completed_session, get_risk_scores_for_session


@dataclass
class RiskScoreInfo:
    category: str
    score: float
    level: str


@dataclass
class BusinessContext:
    industry: str
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
    ) -> BusinessContext:
        profile = await get_business_by_id(db, business_profile_id)
        if not profile:
            raise NotFoundException("Business profile not found")

        location = None
        if profile.city or profile.state:
            location = ", ".join(filter(None, [profile.city, profile.state]))

        context = BusinessContext(
            industry=profile.industry.name if profile.industry else "Unknown",
            business_size=profile.annual_turnover_range,
            employee_count=profile.employee_count,
            location=location,
        )

        session = await get_latest_completed_session(db, business_profile_id)
        if session:
            scores = await get_risk_scores_for_session(db, session.id)
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
            f"Industry: {ctx.industry}",
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
