"""Constants for policy comparison."""

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

LLM_MODEL = "llama-3.3-70b-versatile"
