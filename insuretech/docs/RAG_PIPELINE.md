# RAG Pipeline Documentation

## 1. Overview

This document outlines the end-to-end process of the Retrieval-Augmented Generation (RAG) pipeline for insurance policy documents, from initial PDF extraction to serving LLM-generated answers via an API.

The pipeline processes raw PDF policy documents, transforms them into structured, searchable chunks, stores them in a vector database (PostgreSQL with pgvector), and retrieves relevant information to augment an LLM's response.

**Data Flow Diagram:**

```mermaid
graph TD
    A[Raw PDF Policies] --> B(policy_extractor.py)
    B --> C(Cleaned Text)
    C --> D(policy_cleaner.py)
    D --> E(Cleaned Pages Text)
    E --> F(metadata_extractor.py)
    F --> G(Document Metadata)
    G & E --> H(section_detector.py)
    H --> I(Structured Sections)
    I --> J(policy_chunker.py)
    J --> K(Policy Chunks)
    K --> L(embeddings.py)
    L --> M(Vector Embeddings)
    K & M --> N(pgvector_loader.py)
    N --> O(PostgreSQL + PgVector DB)

    subgraph Retrieval & Generation (API)
        P[User Query + Filters] --> Q(RAGService.query)
        Q --> R(rag_pipeline.py - Retrieval)
        R --> S{PgVector DB Query}
        S --> T[Top-K Chunks]
        T --> U(RAGService.query)
        U --> V{LLM (Groq) - Generation}
        V --> W[LLM Answer + Chunks]
    end

    O --> S
    W --> X[API Response]
```

## 2. Pipeline Stages

The ingestion pipeline consists of 6 main stages, executed sequentially by `run_ingestion.py`.

### Stage 1: PDF Extraction (`policy_extractor.py`)
- **Purpose:** Converts raw PDF documents into text (usually markdown or structured JSON) using an external parser (e.g., LlamaParse).
- **Input:** Raw PDF files.
- **Output:** JSON files in `backend/parsed_output/<category>/` containing raw text and page-level content.

### Stage 2: Cleaning (`policy_cleaner.py`)
- **Purpose:** Removes noise, unwanted headers/footers, and irrelevant administrative pages from the extracted text to improve quality for downstream processing.
- **Input:** JSON files from `parsed_output/`.
- **Output:** JSON files in `backend/cleaned_output/<category>/` with cleaned text, removed pages list, and updated page counts.
- **Key Logic:** Regular expressions for footer patterns, admin page keyword detection, HTML entity fixing, and whitespace normalization. Preserves insurer names and document structure.

### Stage 3: Metadata Extraction (`metadata_extractor.py`)
- **Purpose:** Extracts key metadata (insurer name, policy name, UIN, insurance category) from the cleaned text to enrich the document context.
- **Input:** JSON files from `cleaned_output/`.
- **Output:** JSON files in `backend/metadata_output/<category>/` containing extracted metadata.
- **Key Logic:** Pattern matching for UIN/IRDAN, common insurer name identification, and policy name heuristics based on headings.

### Stage 4: Section Detection (`section_detector.py`)
- **Purpose:** Identifies logical sections (e.g., "Coverage," "Exclusions," "Claims Procedure") within the cleaned text, classifies their type, and merges related sections.
- **Input:** JSON files from `cleaned_output/` and `metadata_output/`.
- **Output:** JSON files in `backend/section_output/<category>/` with an array of structured sections, each having `heading`, `type`, `level`, and `content`.
- **Key Logic:**
    - Regex for markdown-style headings (`# Heading`).
    - Keyword-based classification (`SECTION_TYPE_RULES`) for 9 types (coverage, exclusions, claims, etc.).
    - Merges consecutive sections of the same type.
    - **Fix for Insurer Headings:** Identifies headings that are merely page header artifacts (e.g., insurer names repeated on pages) and merges their content into the preceding valid section, preventing content loss and improving section integrity.

### Stage 5: Chunking (`policy_chunker.py`)
- **Purpose:** Breaks down long sections into smaller, more digestible chunks suitable for embedding and retrieval. Preserves semantic boundaries.
- **Input:** JSON files from `section_output/`.
- **Output:** JSON files in `backend/chunk_output/<category>/` with an array of chunks, each containing rich metadata.
- **Key Logic:**
    - **Adaptive Section Chunking:**
        - If a section's token count is <= 800, it becomes a single chunk.
        - If > 800 tokens, it's split into smaller chunks (approx. 800 tokens each) along paragraph boundaries (`

`), ensuring semantic coherence.
    - Each chunk carries detailed metadata: `chunk_id`, `document_id`, `policy_name`, `insurer`, `insurance_category`, `section_name`, `section_type`, `chunk_index`, `total_chunks`, and the `text` content.

### Stage 6: Embedding + PgVector Storage (`embeddings.py` & `pgvector_loader.py`)
- **Purpose:** Generates vector embeddings for each chunk and stores them, along with their metadata, in the PostgreSQL database using the `pgvector` extension.
- **Input:** JSON files from `chunk_output/`.
- **Output:** Populated `policies`, `policy_documents`, `insurers`, `insurance_categories`, and `document_chunks` tables in PostgreSQL.
- **Key Logic:**
    - `embeddings.py`: Uses `sentence_transformers` with `BAAI/bge-base-en-v1.5` to generate 768-dimensional embeddings for chunk text.
    - `pgvector_loader.py`:
        - Ensures `insurers` and `insurance_categories` records exist (creates if new).
        - Ensures `policies` and `policy_documents` records exist for each unique policy document.
        - Generates embeddings for all chunks in batch.
        - Inserts chunks into the `document_chunks` table, storing the vector embedding and the chunk's metadata as a `JSONB` column.

## 3. Retrieval & Generation (API)

This phase handles user queries, retrieves relevant information, and generates an LLM-based answer.

### Stage 7: Retrieval (`rag_pipeline.py`)
- **Purpose:** Given a user query and optional filters, retrieves the most relevant document chunks from the PgVector database.
- **Input:** User query (`str`), optional `insurance_categories` (`list[str]`), optional `section_type` (`str`), `top_k` (`int`).
- **Output:** A list of top-K `DocumentChunk` objects (as dictionaries) with their content and metadata.
- **Key Logic:**
    - Generates embedding for the user's query.
    - **Section Type Detection:** Automatically detects relevant section types (e.g., "exclusions," "claims") from the query using keywords (`SECTION_KEYWORDS`) for targeted search.
    - **Optional Category Filter:**
        - If `insurance_categories` is provided, filters chunks to only those categories.
        - If `None`, searches across **all** insurance categories for maximum recall, allowing vector similarity to identify cross-category relevance (e.g., "fire" in a "Business Package" policy).
    - **PgVector Similarity Search:** Uses `embedding <=> :query_embedding` (cosine distance) to find the most similar chunks.
    - Includes a hardcoded `RISK_TO_CATEGORIES` mapping for V1 to assist the recommendation engine in identifying relevant categories for a given risk (e.g., "fire" maps to "Fire & Property", "Business Package", "Industry_All_risk"). This will eventually be replaced by a database-driven mapping.

### Stage 8: Generation (`llm_providers.py` & `RAGService`)
- **Purpose:** Uses an LLM (Groq) to generate a concise, accurate answer based on the retrieved chunks.
- **Input:** Retrieved chunks, system prompt, user query.
- **Output:** LLM-generated answer (`str`).
- **Key Logic:**
    - `llm_providers.py`: A wrapper for the Groq API (`llama-3.1-8b-instant`). Requires `GROQ_API_KEY` in `.env`.
    - `RAGService` (`modules/rag/service.py`):
        - Orchestrates the retrieval (calls `rag_pipeline.retrieve_chunks()`).
        - Formats the retrieved chunks into a clear context for the LLM.
        - Calls `llm_providers.generate_response()` to get the answer.
        - Provides a fallback message if `GROQ_API_KEY` is missing.

## 4. Database Schema

Key tables involved:

- `insurers`: Stores details of insurance companies (`id`, `name`).
- `insurance_categories`: Defines types of insurance (`id`, `name`, `risk_category_id`).
- `policies`: Represents individual policy products (`id`, `policy_name`, `insurer_id`, `insurance_category_id`).
- `policy_documents`: Represents physical documents (`id`, `file_name`, `policy_id`, `insurer_id`).
- `document_chunks`: Stores the core RAG data:
    - `id` (UUID)
    - `policy_id` (FK to `policies`)
    - `document_id` (FK to `policy_documents`)
    - `chunk_index` (int)
    - `chunk_text` (text)
    - `embedding` (`vector(768)`) — the BGE embedding
    - `page_number` (int, nullable)
    - `document_metadata` (`JSONB`) — stores rich chunk metadata (`section_name`, `section_type`, `insurer`, `insurance_category`, `chunk_index`, `total_chunks`).

## 5. API Usage

The RAG pipeline is exposed via a FastAPI endpoint in the `modules/rag/` module.

**Endpoint:** `POST /api/v1/rag/ask`

**Authentication:** Requires a valid access token from `get_current_user` (i.e., user must be logged in).

**Request Body (`RagQueryRequest`):**

```json
{
  "query": "What are the exclusions for property damage?",
  "insurance_categories": ["Fire & Property", "Business Package"],
  "section_type": "exclusions",
  "top_k": 5
}
```

**Response Body (`APIResponse[RagQueryResponse]`):**

```json
{
  "success": true,
  "data": {
    "answer": "Based on the provided context, the exclusions for property damage under the ICICI Lombard Fire and Allied Perils Insurance Policy include...",
    "chunks": [
      {
        "text": "...",
        "policy_name": "ICICI Lombard Fire and Allied Perils Insurance Policy",
        "insurer": "ICICI Lombard General Insurance Company Limited",
        "insurance_category": "Fire & Property",
        "section_name": "General Exclusions",
        "section_type": "exclusions",
        "similarity": 0.825
      }
      // ... more chunks
    ],
    "provider": "groq"
  },
  "message": "RAG query completed"
}
```

## 6. Running the Full Pipeline

The entire ingestion pipeline can be executed using the `run_ingestion.py` script.

```bash
# Navigate to the backend directory
cd backend

# Run the full pipeline (PDF extraction will use LlamaParse, requires API key)
python run_ingestion.py

# To skip PDF extraction (if parsed_output is already populated)
python run_ingestion.py --skip-extract
```

**Note:** The embedding generation step is CPU-bound and can take approximately 10-15 minutes for 2000+ chunks.

## 7. Troubleshooting

- **`GROQ_API_KEY not set` error:** Ensure `GROQ_API_KEY=your_key_here` is present in `backend/.env`.
- **Database connection issues:** Verify PostgreSQL is running and credentials in `DATABASE_URL` in `backend/.env` are correct.
- **Module not found errors:** Ensure you are running scripts from the `backend/` directory or have set `PYTHONPATH=/path/to/insuretech/backend`.
- **Embedding generation timeouts:** Increase the `timeout` parameter when executing `pgvector_loader.py` via bash (e.g., `timeout=1800000` for 30 minutes).

---
