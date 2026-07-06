import asyncio
from pathlib import Path
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models import User
from app.modules.recommendations.service import Service as RecommendationService
from app.modules.reports import repository
from app.modules.reports.constants import (
    PROFILING_SESSION_NOT_FOUND_MESSAGE,
    RECOMMENDED_POLICIES_LIMIT,
    REPORT_DOWNLOAD_URL_TEMPLATE,
    REPORT_FILE_NOT_FOUND_MESSAGE,
    REPORT_NOT_FOUND_MESSAGE,
    REPORT_TYPE_RISK_ADVISORY,
    REPORTS_DIR,
    RISK_ADVISORY_GENERATED_MESSAGE,
    RISK_ADVISORY_PDF_FILENAME_TEMPLATE,
    RISK_ADVISORY_TXT_FILENAME_TEMPLATE,
    UNKNOWN_LABEL,
    UNKNOWN_LEVEL_LABEL,
)
from app.modules.reports.pdf_builder import PdfReportBuilder
from app.modules.reports.schemas import (
    ReportBusinessOut,
    ReportPolicyOut,
    ReportRiskFactorOut,
    ReportRiskScoreOut,
    RiskAdvisoryReportOut,
)
from app.shared.response import APIResponse


class ReportService:
    def __init__(self, recommendation_service=None) -> None:
        self._recommendation_service = recommendation_service or RecommendationService
        self._pdf_builder = PdfReportBuilder()

    async def generate_risk_advisory_report(
        self,
        session_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        session = await repository.get_session_with_business(db, session_id)
        if not session or not session.business_profile:
            raise NotFoundException(PROFILING_SESSION_NOT_FOUND_MESSAGE)

        business = session.business_profile
        if business.user_id != user.id:
            raise NotFoundException(PROFILING_SESSION_NOT_FOUND_MESSAGE)

        recommendations_response = await self._recommendation_service.get_recommendations(
            session_id, user, db
        )
        recommendation_data = recommendations_response.data or {}
        if not recommendation_data.get("recommendations"):
            recommendations_response = (
                await self._recommendation_service.generate_recommendations(
                    session_id, user, db
                )
            )
            recommendation_data = recommendations_response.data or {}

        report = await repository.create_completed_report(
            db=db,
            business_id=business.id,
            session_id=session.id,
            report_type=REPORT_TYPE_RISK_ADVISORY,
        )

        risk_scores = [
            self._risk_score_to_report(score)
            for score in recommendation_data.get("scores", [])
        ]
        recommended_policies = [
            self._policy_to_report(rec)
            for rec in recommendation_data.get("recommendations", [])[
                :RECOMMENDED_POLICIES_LIMIT
            ]
        ]

        out = RiskAdvisoryReportOut(
            report_id=report.id,
            session_id=session.id,
            report_type=report.report_type,
            status=report.status,
            generated_at=report.generated_at,
            file_url=None,
            business=ReportBusinessOut(
                id=business.id,
                business_name=business.business_name,
                industry=business.industry.name if business.industry else None,
                segment=business.segment.name if business.segment else None,
                city=business.city,
                state=business.state,
                employee_count=business.employee_count,
                annual_turnover_range=business.annual_turnover_range,
            ),
            executive_summary=self._executive_summary(
                risk_scores, recommended_policies
            ),
            risk_scores=risk_scores,
            recommended_policies=recommended_policies,
            next_steps=[
                "Review the highest-risk categories first and confirm whether current insurance already covers them.",
                "Compare the recommended policies side by side before purchase or renewal.",
                "Discuss exclusions, limits, deductibles, and required add-ons with the insurer or advisor.",
            ],
            metadata={
                "risk_score_count": len(risk_scores),
                "recommended_policy_count": len(recommended_policies),
            },
        )

        await asyncio.to_thread(
            self._pdf_builder.build, out, REPORTS_DIR, RISK_ADVISORY_PDF_FILENAME_TEMPLATE
        )
        file_url = REPORT_DOWNLOAD_URL_TEMPLATE.format(report_id=report.id)
        report = await repository.update_report_file_url(db, report, file_url)
        await db.commit()

        out.file_url = report.file_url
        return APIResponse.success_response(
            message=RISK_ADVISORY_GENERATED_MESSAGE,
            data=out.model_dump(mode="json"),
        )

    async def get_report_download_path(
        self,
        report_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> tuple[Path, str]:
        report = await repository.get_report_with_business(db, report_id)
        if (
            not report
            or not report.business_profile
            or report.business_profile.user_id != user.id
        ):
            raise NotFoundException(REPORT_NOT_FOUND_MESSAGE)

        file_path = REPORTS_DIR / RISK_ADVISORY_PDF_FILENAME_TEMPLATE.format(
            report_id=report.id
        )
        if not file_path.exists():
            legacy_path = REPORTS_DIR / RISK_ADVISORY_TXT_FILENAME_TEMPLATE.format(
                report_id=report.id
            )
            if not legacy_path.exists():
                raise NotFoundException(REPORT_FILE_NOT_FOUND_MESSAGE)
            file_path.write_bytes(
                self._pdf_builder.build_legacy_from_text(
                    legacy_path.read_text(encoding="utf-8")
                )
            )

        return file_path, file_path.name

    def _risk_score_to_report(self, score: dict) -> ReportRiskScoreOut:
        breakdown = score.get("factor_breakdown") or {}
        factors = []
        if isinstance(breakdown, dict):
            for name, value in breakdown.items():
                try:
                    factor_score = float(value)
                except (TypeError, ValueError):
                    continue
                factors.append(ReportRiskFactorOut(name=str(name), score=factor_score))

        factors.sort(key=lambda item: item.score, reverse=True)
        return ReportRiskScoreOut(
            risk_category_name=score.get("risk_category_name", UNKNOWN_LABEL),
            score=float(score.get("score") or 0),
            risk_level=score.get("risk_level", UNKNOWN_LEVEL_LABEL),
            risk_factors=factors,
        )

    def _policy_to_report(self, recommendation: dict) -> ReportPolicyOut:
        return ReportPolicyOut(
            company_name=recommendation.get("company_name"),
            policy_id=recommendation.get("policy_id"),
            policy_name=recommendation.get("policy_name"),
            recommendation_score=recommendation.get("recommendation_score"),
            matched_risk_categories=recommendation.get("matched_risk_categories") or [],
            why_recommended=recommendation.get("why_recommended"),
            coverage_summary=recommendation.get("coverage_summary"),
            key_benefits=recommendation.get("key_benefits") or [],
            important_limitations=recommendation.get("important_limitations") or [],
            coverage_highlights=recommendation.get("coverage_highlights") or [],
        )

    def _executive_summary(
        self,
        risk_scores: list[ReportRiskScoreOut],
        recommended_policies: list[ReportPolicyOut],
    ) -> str:
        top_risks = sorted(risk_scores, key=lambda item: item.score, reverse=True)[:3]
        risk_names = (
            ", ".join(risk.risk_category_name for risk in top_risks)
            or "the assessed risk categories"
        )
        return (
            f"The assessment identifies {risk_names} as the highest-priority risk areas. "
            f"The report lists {len(recommended_policies)} recommended policies selected from the user's risk profile and policy wording evidence."
        )


Service = ReportService()
