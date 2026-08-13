# InsureTech Backend — API, RAG & Policy Comparison Engine

The **InsureTech Backend** is a high-performance RESTful API service built with **FastAPI**, **SQLAlchemy 2.0 (Async)**, **PostgreSQL (`pgvector`)**, and **Groq LLaMA 3.3**. It powers business risk profiling, policy matching, side-by-side policy comparison, document chunk indexing, and conversational RAG (Retrieval-Augmented Generation).

---

## 🛠️ Architecture & Tech Stack

- **Framework**: FastAPI (Python 3.12+)
- **Database**: PostgreSQL with `asyncpg` driver & `pgvector` extension
- **ORM & Migrations**: SQLAlchemy 2.0 (Async Session) & Alembic
- **Authentication**: OAuth2 JWT Access Tokens & Refresh Tokens with bcrypt hashing
- **Embeddings**: `BAAI/bge-base-en-v1.5` via SentenceTransformers (768-dimensional dense vectors)
- **Keyword & Search Fusion**: PostgreSQL Full-Text Search (`tsvector`) + Reciprocal Rank Fusion (RRF)
- **Reranker**: `cross-encoder/ms-marco-MiniLM-L-6-v2` via CrossEncoder
- **LLM Engine**: Groq API (`llama-3.3-70b-versatile`)
- **Email Delivery**: FastAPI-Mail (SMTP integration)
- **File Storage**: Cloudinary integration for policy PDF assets

---

## 📁 Backend Directory Architecture

```text
backend/
├── alembic/                      # Database migration versions and env configuration
│   └── versions/                 # Alembic revision scripts
├── app/
│   ├── ai/                       # AI, RAG & Vector Storage Core
│   │   ├── ingestion/            # PDF parsing, clause detection & pgvector indexer
│   │   ├── models/               # BGE embedding service loader
│   │   ├── output/               # Processed policy chunk metadata
│   │   └── retrieval/            # Hybrid Policy Retriever (Vector + Keyword + RRF)
│   ├── api/
│   │   └── v1/                   # Router registrations for all v1 modules
│   ├── core/                     # Core infrastructure
│   │   ├── config.py             # Pydantic Settings environment configuration
│   │   ├── database.py           # Async engine & session factory
│   │   ├── exceptions.py         # Global error handlers & HTTP exceptions
│   │   ├── logging.py            # Structured logging setup
│   │   └── security.py           # JWT generation & password hashing
│   ├── models/                   # SQLAlchemy ORM Data Models
│   │   ├── business_profiles.py
│   │   ├── document_chunks.py    # Chunk text, 768-dim pgvector embedding & JSONB metadata
│   │   ├── policies.py
│   │   ├── recommendations.py
│   │   └── users.py
│   ├── modules/                  # Domain Business Services & Routers
│   │   ├── auth/                 # User authentication & token management
│   │   ├── businesses/           # Business profile management
│   │   ├── policies/             # Policy CRUD & document indexing
│   │   ├── policy_comparison/    # Hybrid section-by-section policy comparison service
│   │   ├── profiling/            # Business risk profiling questionnaire
│   │   ├── rag/                  # Policy Q&A assistant endpoints
│   │   └── recommendations/      # Evidence-backed policy recommendation engine
│   └── main.py                   # FastAPI application initialization
├── seed/                         # Database seed scripts & initial JSON datasets
├── tests/                        # PyTest test cases
├── requirements.txt              # Production Python package requirements
└── README.md                     # Backend developer documentation
```

---

## ⚙️ Environment Configuration

Create a `.env` file inside `insuretech/backend/` with the following variables:

```env
# Database Settings
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/insuretech
ECHO_SQL=False

# Application Security
SECRET_KEY=change_this_to_a_secure_random_secret_key_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=30
COOKIE_SECURE=False

# App Metadata
PROJECT_NAME=Insuretech
ENVIRONMENT=development
LOG_LEVEL=INFO

# AI & RAG Configuration
EMBEDDING_MODEL=BAAI/bge-base-en-v1.5
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TEMPERATURE=0.05

# Optional Third-Party Services
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
FRONTEND_URL=http://localhost:5173
```

---

## 🚀 Setup & Local Execution

### 1. Environment Setup
```bash
cd insuretech/backend

# Create Python 3.12 virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Database Migration & Seeding
Ensure PostgreSQL is running and `pgvector` extension is enabled (`CREATE EXTENSION IF NOT EXISTS vector;`):

```bash
# Run database migrations
alembic upgrade head

# Seed default policies, risk categories, and questionnaire data
python seed/seed.py
```

### 3. Start Development Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **API Base URL**: `http://localhost:8000/api/v1`
- **Interactive OpenAPI Documentation**: `http://localhost:8000/docs`

---

## 🔬 Policy Comparison Engine & Hybrid RAG Architecture

The Policy Comparison Module (`app/modules/policy_comparison`) evaluates two insurance policies section-by-section.

```mermaid
sequenceDiagram
    autonumber
    Client->>Comparison API: POST /api/v1/compare (policy_id_a, policy_id_b)
    Comparison API->>Hybrid Retriever: Retrieve chunks per section (Coverage, Exclusions, Claims, Conditions)
    Hybrid Retriever->>PostgreSQL: Vector Search (CAST(vector) cosine distance)
    Hybrid Retriever->>PostgreSQL: Keyword Search (tsvector plainto_tsquery)
    Hybrid Retriever->>Reranker: Reciprocal Rank Fusion + CrossEncoder Rerank
    Hybrid Retriever-->>Comparison API: Top section chunks
    Comparison API->>Groq LLaMA 3.3: LLM Inference with business context & retrieved chunks
    Comparison API-->>Client: CompareResponse JSON (Categories, Advantages, Limitations, Evidence)
```

### Key Retrieval Resilience Features
1. **Vector & Full-Text Search Fusion**: Combines dense vector similarity (`CAST(:query_vector AS vector)`) with PostgreSQL full-text search (`tsvector` + `plainto_tsquery`).
2. **Transaction Rollback Handling**: Wraps SQL search queries in explicit rollback protection so query parameter syntax errors or connection resets never abort the transaction block.
3. **Unclassified Chunk Fallback**: If a policy document has unclassified sections (`section_type: "other"` or `NULL`), chunk retrieval automatically falls back to unconstrained policy search.
4. **Direct DB Keyword Fallback**: If hybrid retrieval returns 0 chunks, direct database fallback matches section keywords (`coverage`, `exclusions`, `claims`, `conditions`) directly from `document_chunks`.
5. **Fallback Point Extraction**: Sentence extraction handles table formatting, pipe boundaries (`|`), and list markers without discarding available policy text.

---

## 🧪 Testing

Run backend tests with `pytest`:

```bash
cd insuretech/backend
PYTHONPATH=. .venv/bin/pytest tests/test_policy_comparison.py
```

To run all unit tests:
```bash
PYTHONPATH=. .venv/bin/pytest tests/
```
