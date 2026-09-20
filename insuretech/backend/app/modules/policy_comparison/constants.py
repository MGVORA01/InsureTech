"""Constants for policy comparison."""

from app.shared.constants import UNKNOWN_LABEL

COMPARISON_SECTIONS = [
    (
        "What is Covered",
        "what is covered covered benefits insured events coverage scope",
        "coverage",
    ),
    ("Coverage", "coverage benefits insured events scope of cover", "coverage"),
    ("Exclusions", "exclusions not covered exceptions limitations", "exclusions"),
    ("Claims Process", "claims process notice settlement documents", "claims"),
    ("Conditions", "policy conditions duties obligations", "conditions"),
]
REQUIRED_COMPARISON_CATEGORIES = (
    "What is Covered",
    "Coverage",
    "Exclusions",
    "Claims Process",
    "Conditions",
)

ADVANTAGE_TERMS = (
    "cover",
    "indemnify",
    "benefit",
    "extension",
    "reinstatement",
    "defence costs",
    "loss of profit",
    "in-built",
    "pay",
)

LIMITATION_TERMS = (
    "exclusion",
    "deductible",
    "excess",
    "condition",
    "limit",
    "not cover",
    "not payable",
    "warranty",
    "waiting period",
)

ADVANTAGE_NEGATION_TERMS = (
    "not cover",
    "does not cover",
    "not covered",
    "excluded",
    "exclusion",
    "except",
    "no liability",
    "not liable",
    "limitation",
    "warranty",
    "deductible",
    "waiting period",
    "shall not",
    "will not pay",
    "inadmissible",
)

LLM_MODEL = "openai/gpt-oss-120b"
LLM_TEMPERATURE = 0.05

COMPARE_PREFIX = "/compare"
COMPARE_TAG = "Policy Comparison"
COMPARE_ROUTE = ""
COMPARE_CHAT_ROUTE = "/chat"

CONFIDENCE_MEDIUM = "medium"
CONFIDENCE_LOW = "low"
STRONGER_INSUFFICIENT_EVIDENCE = "insufficient_evidence"

INFO_NOT_AVAILABLE_MESSAGE = "Information not available in the selected policies."
NO_WINNER_MESSAGE = "An overall winner cannot be determined from the retrieved evidence."
NOT_SPECIFICALLY_ADDRESSED_MESSAGE = "not specifically addressed"

BUSINESS_PROFILE_NOT_FOUND_MESSAGE = "Business profile not found"
SESSION_BUSINESS_MISMATCH_MESSAGE = "Selected session does not match this business"
SESSION_POLICY_MISMATCH_MESSAGE = (
    "Selected policies must be from this recommendation session"
)
POLICY_A_NOT_FOUND_MESSAGE = "Policy A not found"
POLICY_B_NOT_FOUND_MESSAGE = "Policy B not found"
SAME_POLICY_COMPARISON_MESSAGE = "Cannot compare a policy with itself"
COMPARISON_COMPLETED_MESSAGE = "Comparison completed successfully"
CHAT_RESPONSE_GENERATED_MESSAGE = "Chat response generated"
