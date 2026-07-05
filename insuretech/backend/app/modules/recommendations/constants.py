"""Constants for recommendation scoring."""

PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}
MAX_RECOMMENDATIONS = 5
HIGH_RISK_THRESHOLD = 0.70
PRIORITY_WEIGHTS = [1.0, 0.75, 0.55, 0.4, 0.3, 0.25, 0.2]

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
