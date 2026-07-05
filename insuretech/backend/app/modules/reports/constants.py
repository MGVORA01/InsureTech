"""Constants for report generation."""

from pathlib import Path

REPORT_TYPE_RISK_ADVISORY = "risk_advisory"
REPORTS_DIR = Path(__file__).resolve().parents[3] / "generated_reports"
