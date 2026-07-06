"""Constants for the profiling module."""

from app.shared.constants import (
    DEFAULT_SEGMENT,
    HIGH_RISK_LEVELS,
    RISK_LEVEL_CRITICAL,
    RISK_LEVEL_HIGH,
    RISK_LEVEL_LOW,
    RISK_LEVEL_MEDIUM,
    UNKNOWN_LABEL,
    UNKNOWN_LEVEL_LABEL,
    PROFILING_SESSION_NOT_FOUND_MESSAGE,
)

PROFILING_PREFIX = "/profiling"
PROFILING_TAG = "profiling"

STATUS_ROUTE = "/status"
START_ROUTE = "/start"
SESSION_ROUTE = "/session/{session_id}"
SESSION_ANSWER_ROUTE = "/session/{session_id}/answer"
SESSION_ANSWERS_BATCH_ROUTE = "/session/{session_id}/answers/batch"
SESSION_PREVIEW_SCORES_ROUTE = "/session/{session_id}/preview-scores"
BUSINESS_RESULTS_ROUTE = "/business/{business_id}/results"
SESSION_TIER2_QUESTIONS_ROUTE = "/session/{session_id}/tier2-questions"
SESSION_COMPLETE_ROUTE = "/session/{session_id}/complete"

SECTIONS_ORDER: list[str] = [
    "business_profile",
    "premises_building",
    "assets_stock",
    "machinery_operations",
    "safety_security",
    "claims_history",
    "transit_logistics",
]
DEFAULT_SECTION = SECTIONS_ORDER[0]

SESSION_STATUS_IN_PROGRESS = "in_progress"
SESSION_STATUS_COMPLETED = "completed"

RISK_THRESHOLD_CRITICAL = 0.8
RISK_THRESHOLD_HIGH = 0.6
RISK_THRESHOLD_MEDIUM = 0.3

QUESTION_TYPE_MULTI_SELECT = "multi_select"
MULTI_SELECT_DELIMITERS = ("|||", ",")

NO_BUSINESS_PROFILE_MESSAGE = "No business profile found"
PROFILING_STATUS_FETCHED_MESSAGE = "Profiling status fetched successfully"
RESUMED_SESSION_MESSAGE = "Resumed active profiling session"
LOADED_COMPLETED_SESSION_MESSAGE = "Loaded completed profiling session"
SESSION_STARTED_MESSAGE = "Profiling session started successfully"
SESSION_STATE_FETCHED_MESSAGE = "Session state fetched successfully"
ANSWER_SUBMITTED_MESSAGE = "Answer submitted successfully"
BATCH_ANSWERS_SUBMITTED_MESSAGE = "Batch answers submitted successfully"
PROFILING_COMPLETED_MESSAGE = "Profiling completed successfully"
PREVIEW_SCORES_COMPUTED_MESSAGE = "Preview scores computed"
NO_HIGH_RISK_CATEGORIES_MESSAGE = "No high-risk categories found"
TIER2_QUESTIONS_FETCHED_MESSAGE = "Tier 2 questions fetched"
BUSINESS_RESULTS_FETCHED_MESSAGE = "Business profiling results fetched successfully"

UNKNOWN_SECTION_MESSAGE_TEMPLATE = "Unknown section: {section}"
NO_COMPLETED_SESSION_MESSAGE = "No completed profiling session found for this business"
