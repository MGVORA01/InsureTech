"""Constants for report generation."""

from pathlib import Path

from app.shared.constants import (
    PROFILING_SESSION_NOT_FOUND_MESSAGE,
    RISK_LEVEL_CRITICAL,
    RISK_LEVEL_HIGH,
    RISK_LEVEL_LOW,
    RISK_LEVEL_MEDIUM,
    UNKNOWN_LABEL,
    UNKNOWN_LEVEL_LABEL,
)

REPORTS_PREFIX = "/reports"
REPORTS_TAG = "reports"
GENERATE_RISK_ADVISORY_ROUTE = "/{session_id}/risk-advisory"
DOWNLOAD_REPORT_ROUTE = "/{report_id}/download"

REPORT_TYPE_RISK_ADVISORY = "risk_advisory"
REPORT_STATUS_COMPLETED = "completed"
REPORTS_DIR = Path(__file__).resolve().parents[3] / "generated_reports"

RISK_ADVISORY_PDF_FILENAME_TEMPLATE = "risk-advisory-report-{report_id}.pdf"
RISK_ADVISORY_TXT_FILENAME_TEMPLATE = "risk-advisory-report-{report_id}.txt"
REPORT_DOWNLOAD_URL_TEMPLATE = "/api/v1/reports/{report_id}/download"
PDF_MEDIA_TYPE = "application/pdf"

HIGH_RISK_LEVELS = {RISK_LEVEL_HIGH, RISK_LEVEL_CRITICAL}

RISK_PRIORITY_LABELS = {
    RISK_LEVEL_LOW: "Low priority",
    RISK_LEVEL_MEDIUM: "Medium priority",
    RISK_LEVEL_HIGH: "High priority",
    RISK_LEVEL_CRITICAL: "Critical priority",
}

UNKNOWN_POLICY_LABEL = "Unknown Policy"
UNKNOWN_COMPANY_LABEL = "Unknown Company"
NOT_AVAILABLE_LABEL = "N/A"

TOP_RISKS_LIMIT = 3
RECOMMENDED_POLICIES_LIMIT = 5
RISK_FACTORS_LIMIT = 5
COVERAGE_HIGHLIGHTS_LIMIT = 6
KEY_BENEFITS_LIMIT = 5
IMPORTANT_LIMITATIONS_LIMIT = 4
MAX_LINES_PER_PAGE = 43

REPORT_NOT_FOUND_MESSAGE = "Report not found"
REPORT_FILE_NOT_FOUND_MESSAGE = "Report file not found"
RISK_ADVISORY_GENERATED_MESSAGE = "Risk advisory report generated successfully"
