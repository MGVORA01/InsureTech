"""Constants for recommendation scoring."""

from app.shared.constants import DEFAULT_SEGMENT, UNKNOWN_LABEL

RECOMMENDATIONS_PREFIX = "/recommendations"
RECOMMENDATIONS_TAG = "recommendations"
GET_RECOMMENDATIONS_ROUTE = "/{session_id}"
GENERATE_RECOMMENDATIONS_ROUTE = "/{session_id}/generate"
POLICY_DOWNLOAD_ROUTE = "/{session_id}/policies/{policy_id}/download"

PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}
MAX_RECOMMENDATIONS = 5
HIGH_RISK_THRESHOLD = 0.70
PRIORITY_WEIGHTS = [1.0, 0.75, 0.55, 0.4, 0.3, 0.25, 0.2]

NO_RECOMMENDATIONS_YET_MESSAGE = (
    "No recommendations generated yet. Use /generate to create them."
)
RECOMMENDATIONS_FETCHED_MESSAGE = "Recommendations fetched successfully"
NO_RISK_SCORES_MESSAGE = "No risk scores found for policy recommendation."
NO_SUITABLE_POLICY_EVIDENCE_MESSAGE = (
    "No suitable policy evidence found for high-priority risks."
)
RECOMMENDATIONS_GENERATED_MESSAGE = "Recommendations generated successfully"
RECOMMENDED_POLICY_NOT_FOUND_MESSAGE = "Recommended policy document not found"
POLICY_PDF_UNAVAILABLE_MESSAGE = "Policy PDF is not available for download"
POLICY_DOWNLOAD_RETRIEVED_MESSAGE = "Policy download link retrieved"
PROFILING_SESSION_NOT_FOUND_MESSAGE = "Profiling session not found"

BENEFIT_TERMS = (
    "cover",
    "indemnify",
    "pay",
    "benefit",
    "in-built",
    "extension",
    "reinstatement",
    "defence costs",
    "loss of profit",
)

IMPORTANT_LIMITATION_TERMS = (
    "exclusion",
    "deductible",
    "excess",
    "not cover",
    "not payable",
    "condition",
    "limit",
    "underinsurance",
)

HIGHLIGHT_BENEFIT_TERMS = (
    "cover",
    "indemnify",
    "pay",
    "benefit",
    "extension",
    "in-built",
    "reinstatement",
    "loss of profit",
    "defence costs",
    "theft",
    "fire",
    "transit",
)

HIGHLIGHT_LIMITATION_TERMS = (
    "exclusion",
    "excess",
    "deductible",
    "not cover",
    "condition",
    "underinsurance",
)

RISK_KEYWORDS: dict[str, list[str]] = {
    "Fire Risk": [
        "fire",
        "special perils",
        "property damage",
        "building",
        "stock",
        "contents",
        "sprinkler",
        "explosion",
        "lightning",
        "debris",
    ],
    "Theft & Burglary Risk": [
        "theft",
        "burglary",
        "robbery",
        "housebreaking",
        "stolen",
        "security",
        "break-in",
        "cash",
        "money",
    ],
    "Employee/Workforce Risk": [
        "employee",
        "workforce",
        "workmen",
        "workers compensation",
        "personal accident",
        "group health",
        "injury",
        "disablement",
    ],
    "Public Liability Risk": [
        "public liability",
        "third party",
        "legal liability",
        "bodily injury",
        "property damage",
        "claimant",
        "defence costs",
        "pollution",
    ],
    "Business Interruption Risk": [
        "business interruption",
        "consequential loss",
        "loss of profit",
        "gross profit",
        "indemnity period",
        "standing charges",
        "increased cost of working",
    ],
    "Transit Risk": [
        "transit",
        "marine",
        "cargo",
        "voyage",
        "inland transit",
        "shipment",
        "transport",
        "loading",
        "unloading",
    ],
    "Machinery & Equipment Risk": [
        "machinery",
        "equipment",
        "breakdown",
        "plant and machinery",
        "boiler",
        "electrical",
        "mechanical",
        "repair",
        "reinstatement",
    ],
}

RISK_ALIASES = {
    "Public Liability": "Public Liability Risk",
    "Theft/Burglary Risk": "Theft & Burglary Risk",
    "Machinery/Equipment Breakdown": "Machinery & Equipment Risk",
    "Machinery/Equipment Risk": "Machinery & Equipment Risk",
    "Business Interruption": "Business Interruption Risk",
}
