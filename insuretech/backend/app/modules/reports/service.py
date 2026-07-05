from pathlib import Path
import textwrap
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models import User
from app.modules.recommendations.service import Service as RecommendationService
from app.modules.reports import repository
from app.modules.reports.constants import REPORTS_DIR, REPORT_TYPE_RISK_ADVISORY
from app.modules.reports.schemas import (
    ReportBusinessOut,
    ReportPolicyOut,
    ReportRiskFactorOut,
    ReportRiskScoreOut,
    RiskAdvisoryReportOut,
)
from app.shared.response import APIResponse


class ReportService:
    async def generate_risk_advisory_report(
        self,
        session_id: UUID,
        user: User,
        db: AsyncSession,
    ) -> APIResponse:
        session = await repository.get_session_with_business(db, session_id)
        if not session or not session.business_profile:
            raise NotFoundException("Profiling session not found")

        business = session.business_profile
        if business.user_id != user.id:
            raise NotFoundException("Profiling session not found")

        recommendations_response = await RecommendationService.get_recommendations(
            session_id, user, db
        )
        recommendation_data = recommendations_response.data or {}
        if not recommendation_data.get("recommendations"):
            recommendations_response = (
                await RecommendationService.generate_recommendations(
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
            for rec in recommendation_data.get("recommendations", [])[:5]
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

        self._write_report_file(out)
        file_url = f"/api/v1/reports/{report.id}/download"
        report = await repository.update_report_file_url(db, report, file_url)

        out.file_url = report.file_url
        return APIResponse.success_response(
            message="Risk advisory report generated successfully",
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
            raise NotFoundException("Report not found")

        file_path = REPORTS_DIR / f"risk-advisory-report-{report.id}.pdf"
        if not file_path.exists():
            legacy_path = REPORTS_DIR / f"risk-advisory-report-{report.id}.txt"
            if not legacy_path.exists():
                raise NotFoundException("Report file not found")
            file_path.write_bytes(
                self._legacy_text_report_pdf(legacy_path.read_text(encoding="utf-8"))
            )

        return file_path, file_path.name

    def _write_report_file(self, report: RiskAdvisoryReportOut) -> Path:
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        file_path = REPORTS_DIR / f"risk-advisory-report-{report.report_id}.pdf"
        file_path.write_bytes(self._report_pdf(report))
        return file_path

    def _report_pdf(self, report: RiskAdvisoryReportOut) -> bytes:
        pages = self._report_pdf_pages(report)
        return self._build_pdf(pages)

    def _report_pdf_pages(
        self, report: RiskAdvisoryReportOut
    ) -> list[list[tuple[str, int, bool]]]:
        pages: list[list[tuple[str, int, bool]]] = []
        current: list[tuple[str, int, bool]] = []
        max_lines = 43

        def add_raw(text: str = "", size: int = 10, bold: bool = False) -> None:
            nonlocal current
            if len(current) >= max_lines:
                pages.append(current)
                current = []
            current.append((text, size, bold))

        def add(
            text: str = "", size: int = 10, bold: bool = False, indent: int = 0
        ) -> None:
            if not text:
                add_raw("", size, bold)
                return
            width = max(35, int(96 - indent * 2 - (size - 10) * 4))
            prefix = " " * indent
            for line in textwrap.wrap(str(text), width=width):
                add_raw(f"{prefix}{line}", size, bold)

        def section(title: str, min_lines: int = 8) -> None:
            nonlocal current
            if current and len(current) + min_lines > max_lines:
                pages.append(current)
                current = []
            if current:
                add()
            add(title.upper(), 12, True)

        location = (
            ", ".join(
                part for part in [report.business.city, report.business.state] if part
            )
            or "N/A"
        )
        sorted_risks = sorted(
            report.risk_scores, key=lambda item: item.score, reverse=True
        )
        top_risks = sorted_risks[:3]
        high_risk_count = sum(
            1
            for risk in report.risk_scores
            if (risk.risk_level or "").lower() in {"high", "critical"}
        )

        add("INSURETECH RISK ADVISORY REPORT", 18, True)
        add(
            "Business risk profile, coverage priorities, and policy recommendation notes",
            11,
        )
        add(f"Generated: {report.generated_at.strftime('%d %b %Y, %I:%M %p')}", 9)
        add()
        section("1. Business Profile")
        add(f"Business name: {report.business.business_name}")
        add(f"Industry: {report.business.industry or 'N/A'}")
        add(f"Segment: {report.business.segment or 'N/A'}")
        add(f"Location: {location}")
        add(
            f"Employees: {report.business.employee_count if report.business.employee_count is not None else 'N/A'}"
        )
        add(f"Annual turnover: {report.business.annual_turnover_range or 'N/A'}")

        section("2. Executive Summary")
        add(report.executive_summary)
        add(
            f"The assessment reviewed {len(report.risk_scores)} risk categories and found "
            f"{high_risk_count} category or categories at high or critical priority. "
            "Recommended policies are ranked from the business profile, calculated risk scores, "
            "and available policy wording evidence."
        )
        if top_risks:
            add("Highest priority risks:", 10, True)
            for index, risk in enumerate(top_risks, start=1):
                add(
                    f"{index}. {risk.risk_category_name}: {self._pct(risk.score)} "
                    f"({self._risk_priority_label(risk.risk_level)})",
                    indent=2,
                )

        section("3. How To Read This Report")
        add(
            "Risk scores are shown from 0 to 100. A higher score means the category should be "
            "reviewed earlier because the business profile indicates greater exposure or weaker "
            "controls for that area."
        )
        add("Priority guide:", 10, True)
        add("Low: monitor during normal renewal reviews.", indent=2)
        add("Medium: validate controls and confirm policy limits.", indent=2)
        add("High: review coverage soon and resolve material gaps.", indent=2)
        add("Critical: treat as an immediate coverage and control priority.", indent=2)

        section("4. Risk Score Details")
        if sorted_risks:
            for risk in sorted_risks:
                add(
                    f"{risk.risk_category_name}: {self._pct(risk.score)} "
                    f"risk score - {self._risk_priority_label(risk.risk_level)}",
                    10,
                    True,
                )
                add(self._risk_action(risk), indent=2)
                if risk.risk_factors:
                    add("Top contributing factors:", 10, True, indent=2)
                    for factor in risk.risk_factors[:5]:
                        add(
                            f"- {factor.name}: {self._pct(factor.score)} contribution",
                            indent=4,
                        )
                else:
                    add(
                        "No factor-level breakdown was available for this category.",
                        indent=2,
                    )
        else:
            add("No risk score data was available for this session.")

        section("5. Recommended Policy Matches")
        if not report.recommended_policies:
            add("No policy recommendations were available for this report.")
        for index, policy in enumerate(report.recommended_policies, start=1):
            add(f"{index}. {policy.policy_name or 'Unknown Policy'}", 11, True)
            add(f"Company: {policy.company_name or 'Unknown Company'}", indent=2)
            add(
                f"Recommendation score: {self._pct(policy.recommendation_score)}",
                indent=2,
            )
            add(
                f"Matched risks: {', '.join(policy.matched_risk_categories) or 'None'}",
                indent=2,
            )
            add("Reason for match:", 10, True, indent=2)
            add(
                policy.why_recommended
                or "Not specified in available recommendation data.",
                indent=4,
            )
            add("Coverage summary:", 10, True, indent=2)
            add(
                policy.coverage_summary
                or "Not specified in available policy evidence.",
                indent=4,
            )
            if policy.coverage_highlights:
                add("Coverage highlights:", 10, True, indent=2)
                for item in policy.coverage_highlights[:6]:
                    add(f"- {item}", indent=4)
            if policy.key_benefits:
                add("Key benefits:", 10, True, indent=2)
                for item in policy.key_benefits[:5]:
                    add(f"- {item}", indent=4)
            if policy.important_limitations:
                add("Important limitations:", 10, True, indent=2)
                for item in policy.important_limitations[:4]:
                    add(f"- {item}", indent=4)
            add()

        section("6. Action Plan")
        if top_risks:
            add("Start with these coverage review actions:", 10, True)
            for risk in top_risks:
                add(f"- {self._risk_action(risk)}")
        for step in report.next_steps:
            add(f"- {step}")

        section("7. Important Notes")
        add(
            "This report is an advisory summary generated from the profiling answers, calculated "
            "risk scores, recommendations, and available policy wording data in the platform. It "
            "does not replace the official policy schedule, insurer quotation, policy wording, or "
            "licensed professional advice."
        )
        add(
            "Before purchase or renewal, confirm sums insured, deductibles, exclusions, sub-limits, "
            "warranties, waiting periods, claim documentation requirements, and add-ons directly "
            "with the insurer or advisor."
        )

        if current:
            pages.append(current)
        return pages or [[("INSURETECH RISK ADVISORY REPORT", 18, True)]]

    def _build_pdf(self, pages: list[list[tuple[str, int, bool]]]) -> bytes:
        objects: list[bytes] = []

        def add_object(body: bytes) -> int:
            objects.append(body)
            return len(objects)

        catalog_id = add_object(b"<< /Type /Catalog /Pages 2 0 R >>")
        pages_id = add_object(b"")
        font_regular_id = add_object(
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
        )
        font_bold_id = add_object(
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
        )

        page_ids: list[int] = []
        for page_number, page in enumerate(pages, start=1):
            content = self._pdf_page_stream(page, page_number, len(pages))
            content_id = add_object(
                b"<< /Length "
                + str(len(content)).encode("ascii")
                + b" >>\nstream\n"
                + content
                + b"\nendstream"
            )
            page_id = add_object(
                (
                    f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 612 792] "
                    f"/Resources << /Font << /F1 {font_regular_id} 0 R /F2 {font_bold_id} 0 R >> >> "
                    f"/Contents {content_id} 0 R >>"
                ).encode("ascii")
            )
            page_ids.append(page_id)

        kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
        objects[pages_id - 1] = (
            f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("ascii")
        )

        pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = [0]
        for index, body in enumerate(objects, start=1):
            offsets.append(len(pdf))
            pdf.extend(f"{index} 0 obj\n".encode("ascii"))
            pdf.extend(body)
            pdf.extend(b"\nendobj\n")

        xref_offset = len(pdf)
        pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
        pdf.extend(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
        pdf.extend(
            (
                f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n"
                f"startxref\n{xref_offset}\n%%EOF\n"
            ).encode("ascii")
        )
        return bytes(pdf)

    def _pdf_page_stream(
        self,
        lines: list[tuple[str, int, bool]],
        page_number: int,
        total_pages: int,
    ) -> bytes:
        commands = [
            "BT",
            "/F2 9 Tf",
            "54 760 Td",
            f"({self._pdf_escape('InsureTech Advisory')}) Tj",
            "ET",
        ]
        y = 724
        for text, size, bold in lines:
            font = "F2" if bold else "F1"
            commands.extend(
                [
                    "BT",
                    f"/{font} {size} Tf",
                    f"54 {y} Td",
                    f"({self._pdf_escape(text)}) Tj",
                    "ET",
                ]
            )
            y -= 18 if size >= 12 else 14

        commands.extend(
            [
                "BT",
                "/F1 8 Tf",
                "54 34 Td",
                f"({self._pdf_escape(f'Page {page_number} of {total_pages}')}) Tj",
                "ET",
            ]
        )
        return "\n".join(commands).encode("latin-1", errors="replace")

    def _pdf_escape(self, text: str) -> str:
        safe = str(text).encode("latin-1", errors="replace").decode("latin-1")
        return safe.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    def _legacy_text_report_pdf(self, content: str) -> bytes:
        pages: list[list[tuple[str, int, bool]]] = []
        current: list[tuple[str, int, bool]] = []
        for raw_line in content.splitlines():
            text = raw_line.strip()
            if len(current) >= 43:
                pages.append(current)
                current = []
            is_heading = (
                bool(text) and not raw_line.startswith((" ", "-")) and len(text) < 50
            )
            size = (
                14
                if text == "INSURETECH RISK ADVISORY REPORT"
                else 11
                if is_heading
                else 10
            )
            current.append((text, size, is_heading))
        if current:
            pages.append(current)
        return self._build_pdf(
            pages or [[("INSURETECH RISK ADVISORY REPORT", 18, True)]]
        )

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
            risk_category_name=score.get("risk_category_name", "Unknown"),
            score=float(score.get("score") or 0),
            risk_level=score.get("risk_level", "unknown"),
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

    def _risk_priority_label(self, risk_level: str | None) -> str:
        labels = {
            "low": "Low priority",
            "medium": "Medium priority",
            "high": "High priority",
            "critical": "Critical priority",
        }
        return labels.get((risk_level or "").lower(), (risk_level or "Unknown").title())

    def _risk_action(self, risk: ReportRiskScoreOut) -> str:
        category = risk.risk_category_name
        level = (risk.risk_level or "").lower()
        if level == "critical":
            return f"Immediately review {category} coverage, limits, exclusions, and operational controls."
        if level == "high":
            return f"Prioritize {category} in the next insurer or advisor discussion and confirm gaps."
        if level == "medium":
            return f"Validate {category} controls and check whether existing cover limits remain adequate."
        return f"Monitor {category} during routine risk and renewal reviews."

    def _pct(self, value: float | int | None) -> str:
        if value is None:
            return "N/A"
        number = float(value)
        if number <= 1:
            number *= 100
        return f"{round(number)}%"


Service = ReportService()
