
CANONICAL_MAP = {
    # HDFC ERGO (2 PDFs)
    "hdfc ergo general insurance company limited": "HDFC ERGO",
    "hdfc ergo": "HDFC ERGO",
    
    # ICICI Lombard (5 PDFs) - merge 2 variants
    "icici lombard general insurance company limited": "ICICI Lombard",
    "icici lombard": "ICICI Lombard",
    
    # SBI General Insurance (9 PDFs) - merge 2 variants
    "sbi general insurance company limited": "SBI General Insurance",
    "sbi general insurance company ltd.": "SBI General Insurance",
    "sbi general insurance": "SBI General Insurance",
    "sbi general": "SBI General Insurance",
    
    # Tata AIG General Insurance (3 PDFs)
    "tata aig general insurance company limited": "Tata AIG General Insurance",
    "tata aig": "Tata AIG General Insurance",
    
    # New India Assurance (4 PDFs) - merge 2 variants
    "the new india assurance company limited": "New India Assurance",
    "the new india assurance co. ltd.": "New India Assurance",
    "new india assurance": "New India Assurance",
    
    # Bajaj Allianz (1 PDF)
    "bajaj general insurance limited": "Bajaj Allianz",
    "bajaj allianz": "Bajaj Allianz",
    
    # IFFCO Tokio (1 PDF)
    "iffco-tokio": "IFFCO Tokio",
    "iffco tokio": "IFFCO Tokio",
    
    # Liberty General Insurance (2 PDFs)
    "liberty general insurance": "Liberty General Insurance",
    
    # United India Insurance (1 PDF)
    "united india insurance company limited": "United India Insurance",
    
    # National Insurance Company (2 PDFs)
    "national insurance company limited": "National Insurance Company",
    
    # Universal Sompo (2 PDFs)
    "universal sompo": "Universal Sompo",
    
    # Raheja QBE General Insurance (1 PDF)
    "raheja qbe general insurance company limited": "Raheja QBE General Insurance",
    
    # Generali (1 PDF)
    "generali": "Generali",
    
    # L&T General Insurance (1 PDF) - from empty insurer PDF
    "l&t general insurance": "L&T General Insurance",
    "l and t general insurance": "L&T General Insurance", # common variant
}

def normalize_insurer_name(name: str) -> str:
    if not name or not name.strip():
        return "L&T General Insurance" # Default for the empty insurer PDF
    key = name.lower().strip()
    # Exact match first
    if key in CANONICAL_MAP:
        return CANONICAL_MAP[key]
    # Partial match
    for variant, canonical in CANONICAL_MAP.items():
        if variant in key: # Only match if variant is IN the key
            return canonical
    return name
