# AI and RAG Folder Guide

All AI, RAG, PDF ingestion, embeddings, and LLM code lives under `app/ai/`.

```text
app/ai/
├── ingestion/                         # Turns policy PDFs into searchable chunks
│   └── pipeline/
│       ├── ingestion_orchestrator.py  # Runs the complete bulk-import pipeline
│       ├── policy_pdf_ingestion_service.py # Ingests one PDF uploaded from the website
│       ├── document_classifier.py      # Detects digital versus scanned PDFs
│       ├── pdf_text_extractor.py       # PyMuPDF → OCR → LlamaParse extraction route
│       ├── policy_document_parser.py   # LlamaParse parser and parsed JSON writer
│       ├── document_layout_analyzer.py # Detects tables, columns, and headings
│       ├── policy_text_cleaner.py      # Removes repeated headers, footers, and admin pages
│       ├── policy_metadata_extractor.py # Finds insurer, policy name, UIN, and category
│       ├── policy_section_detector.py  # Detects coverage, exclusions, claims, conditions, etc.
│       ├── policy_clause_detector.py   # Detects numbered/lettered clauses
│       ├── policy_definition_extractor.py # Extracts defined terms
│       ├── clause_aware_chunker.py     # Creates clause-aware recursive token chunks
│       ├── chunk_quality_validator.py  # Removes invalid chunks
│       ├── chunk_metadata_enricher.py  # Adds tags and source references
│       ├── policy_attribute_extractor.py # Extracts money and percentage values
│       ├── duplicate_chunk_detector.py # Removes duplicate chunks
│       └── pgvector_document_indexer.py # Generates embeddings and stores chunks in PostgreSQL
├── retrieval/
│   └── hybrid_policy_retriever.py      # pgvector + full-text search + reranking
├── models/
│   └── bge_embedding_service.py        # BGE embedding model loader and encoder
├── providers/
│   └── llm_response_generator.py       # LLM provider adapter for final answers
├── shared/
│   └── insurer_name_normalizer.py      # Normalizes insurer names consistently
└── maintenance/
    └── normalize_existing_insurers.py  # One-time database cleanup command
```

Generated RAG artifacts are stored in `app/ai/output/` and ignored by Git:

- `parsed_output/` — extracted PDF pages and raw text
- `layout_output/` — detected layout signals
- `cleaned_output/` — cleaned policy text
- `metadata_output/` — insurer, policy, UIN, and category metadata
- `section_output/` — detected sections, clauses, and definitions
- `chunk_output/` — final chunks ready for embeddings and pgvector

## Main entry points

- Bulk PDFs in `backend/data/`: `python -m app.ai.run_policy_ingestion`
- Custom bulk-PDF folder: `python -m app.ai.run_policy_ingestion --data-dir /path/to/data`
- Website/admin PDF upload: `policy_pdf_ingestion_service.py`
- RAG query endpoint: `retrieval/hybrid_policy_retriever.py`

Before the first import, install dependencies and create indexes:

```bash
pip install -r requirements.txt
alembic upgrade head
```

The ingestion sequence is classification → extraction/OCR → layout → cleaning → metadata
→ sections → clauses/definitions → chunking → validation/enrichment/attributes/deduplication
→ BGE embeddings → PostgreSQL + pgvector. Retrieval uses vector search, full-text search,
cross-encoder reranking, and source citations.
