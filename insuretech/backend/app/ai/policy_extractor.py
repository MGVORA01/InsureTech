import json
import time
from pathlib import Path

from llama_parse import LlamaParse


# ==========================================
# CONFIG
# ==========================================

BASE_DIR = Path(__file__).resolve().parents[2]

DATA_DIR = BASE_DIR.parent / "data"

OUTPUT_DIR = BASE_DIR / "parsed_output"

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

LLAMA_PARSE_API_KEY = "llx-KhLCHZrD2Pdt1bncbZn98jC24K1NqLhyefnnRfArIl4NLasu"


# ==========================================
# PARSE SINGLE PDF
# ==========================================

def parse_policy(pdf_path: Path):

    for attempt in range(3):

        try:

            parser = LlamaParse(
                api_key=LLAMA_PARSE_API_KEY,
                result_type="markdown",
                verbose=True
            )

            docs = parser.load_data(
                str(pdf_path)
            )

            if not docs:
                raise ValueError(
                    "No pages returned by parser"
                )

            pages = []
            full_text = []

            for page_num, doc in enumerate(
                docs,
                start=1
            ):

                pages.append(
                    {
                        "page_number": page_num,
                        "content": doc.text
                    }
                )

                full_text.append(
                    doc.text
                )

            return {

                "source_file":
                    pdf_path.name,

                "document_id":
                    pdf_path.stem,

                "insurance_category":
                    pdf_path.parent.name,

                "page_count":
                    len(pages),

                "raw_text_length":
                    len(
                        "\n\n".join(
                            full_text
                        )
                    ),

                "raw_text":
                    "\n\n".join(
                        full_text
                    ),

                "pages":
                    pages
            }

        except Exception as e:

            print(
                f"Attempt {attempt+1} failed"
            )

            print(e)

            time.sleep(5)

    raise Exception(
        f"Failed parsing: {pdf_path.name}"
    )


# ==========================================
# SAVE JSON
# ==========================================

def save_policy_json(
    policy_json,
    pdf_path
):

    category_folder = (
        OUTPUT_DIR /
        pdf_path.parent.name
    )

    category_folder.mkdir(
        parents=True,
        exist_ok=True
    )

    output_file = (
        category_folder /
        f"{pdf_path.stem}.json"
    )

    with open(
        output_file,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            policy_json,
            f,
            indent=2,
            ensure_ascii=False
        )


# ==========================================
# PROCESS ALL PDFs
# ==========================================

def process_all_policies():

    pdf_files = list(
        DATA_DIR.rglob("*.pdf")
    )

    print(
        f"\nFound {len(pdf_files)} PDFs"
    )

    results = []

    for index, pdf_file in enumerate(
        pdf_files,
        start=1
    ):

        print(
            f"\n[{index}/{len(pdf_files)}]"
        )

        print(
            f"Processing: {pdf_file.name}"
        )

        try:

            policy_json = parse_policy(
                pdf_file
            )

            save_policy_json(
                policy_json,
                pdf_file
            )

            print(
                f"Pages: {policy_json['page_count']}"
            )

            print(
                f"Characters: {policy_json['raw_text_length']}"
            )

            results.append(
                {
                    "file":
                        pdf_file.name,

                    "status":
                        "SUCCESS",

                    "pages":
                        policy_json[
                            "page_count"
                        ],

                    "characters":
                        policy_json[
                            "raw_text_length"
                        ]
                }
            )

        except Exception as e:

            print(
                f"FAILED: {pdf_file.name}"
            )

            print(e)

            results.append(
                {
                    "file":
                        pdf_file.name,

                    "status":
                        "FAILED",

                    "error":
                        str(e)
                }
            )

        time.sleep(2)

    summary_file = (
        OUTPUT_DIR /
        "extraction_summary.json"
    )

    with open(
        summary_file,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            results,
            f,
            indent=2
        )

    print("\nExtraction Complete")


# ==========================================
# MAIN
# ==========================================

if __name__ == "__main__":

    process_all_policies()