from pathlib import Path
import json

from app.ai.ingestion.pipeline.policy_metadata_extractor import _normalize_policy_filename

META_DIR = Path(__file__).resolve().parents[1] / "app" / "ai" / "output" / "metadata_output"


def main():
    files = list(META_DIR.rglob("*.json"))[:20]
    for f in files:
        try:
            j = json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            continue
        src = j.get("source_file") or j.get("document_id")
        stem = Path(src).stem if src else ""
        normalized = _normalize_policy_filename(stem)
        print(f"{f.relative_to(META_DIR)} -> '{stem}' -> '{normalized}'")


if __name__ == "__main__":
    main()
