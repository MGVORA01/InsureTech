# InsureTech — AI-Powered Business Risk Profiling, Policy Recommendation & Comparison Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB.svg?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![pgvector](https://img.shields.io/badge/pgvector-Supported-006400.svg?style=flat)](https://github.com/pgvector/pgvector)
[![Groq LLaMA 3.3](https://img.shields.io/badge/Groq-LLaMA--3.3--70B-orange.svg?style=flat)](https://groq.com/)

**InsureTech** is an enterprise-grade web application designed for business risk profiling, policy matching, side-by-side policy comparison, intelligent recommendations, and interactive AI assistance. Powered by a hybrid Retrieval-Augmented Generation (RAG) pipeline, vector search via `pgvector`, and Groq LLaMA 3.3, InsureTech extracts, indexes, and compares complex insurance policy documents with precision.

---

## 📚 Documentation Directory

- 🌐 **Root Documentation**: [insuretech/README.md](file:///home/meet/Desktop/p7/insuretech/README.md) (This document)
- ⚙️ **Backend Documentation**: [insuretech/backend/README.md](file:///home/meet/Desktop/p7/insuretech/backend/README.md) — FastAPI API, RAG architecture, database migrations, setup guide.
- 🎨 **Frontend Documentation**: [insuretech/frontend/README.md](file:///home/meet/Desktop/p7/insuretech/frontend/README.md) — React + TypeScript UI, Redux Toolkit state, component design, setup guide.

---

## 🌟 Key Capabilities

### 1. Business Risk Profiling
- Interactive questionnaire engine assessing business sector, operational risks, asset values, workforce, and liabilities.
- Automated risk scoring and classification across risk categories.

### 2. Intelligent Recommendation Engine
- Matches scored business risks against indexed policy coverages.
- Ranks candidate insurance policies with evidence-backed match scores and risk priorities.

### 3. Deep Hybrid Policy Comparison
- Side-by-side analysis of two selected policies across 5 core categories:
  - **What is Covered**
  - **Coverage Scope**
  - **Exclusions & Limitations**
  - **Claims Process & Deductibles**
  - **Policy Conditions & Obligations**
- Hybrid RAG combining semantic embeddings (`BAAI/bge-base-en-v1.5`), full-text search (`tsvector`), cross-encoder reranking, and multi-tier database fallback.
- Point-wise advantage and limitation extraction with automatic section-matching fallback.

### 4. Interactive Policy Chat Assistant
- Conversational RAG assistant grounded strictly in retrieved policy document chunks.
- Enables business users to ask detailed clarifying questions about policy terms, coverage limits, and claim rules.

### 5. Enterprise Admin Portal
- Admin management dashboard for managing users, policies, insurance categories, and uploaded policy PDF documents.

---

## 🏗️ Architecture & Technology Stack

```mermaid
graph TD
    Client["React 18 + TypeScript + Redux Toolkit (Vite UI)"]
    API["FastAPI App (Backend API v1)"]
    DB[("PostgreSQL DB + pgvector Extension")]
    AI["Hybrid RAG & Embedding Service (BAAI/bge-base-en-v1.5)"]
    LLM["Groq LLaMA 3.3 70B (LLM Engine)"]
    Storage["Cloudinary Storage (Policy PDFs)"]

    Client <-->|REST API / JSON| API
    API <-->|SQLAlchemy Async / asyncpg| DB
    API <-->|Embeddings & RRF Retrieval| AI
    API <-->|Prompts & Inference| LLM
    API <-->|Document Uploads| Storage
```

### Stack Summary
- **Frontend**: React 18, TypeScript, Vite, Redux Toolkit, React Query, React Router v7, Material UI Icons, Vanilla CSS Design System.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (Async), Alembic, Pydantic v2, FastAPI-Mail.
- **Database**: PostgreSQL with `pgvector` vector similarity search extension.
- **AI & RAG**: `SentenceTransformer` (`BAAI/bge-base-en-v1.5`), `CrossEncoder` (`ms-marco-MiniLM-L-6-v2`), Groq API (`llama-3.3-70b-versatile`).

---

## 📁 Repository Structure

```text
insuretech/
├── backend/                  # FastAPI Backend Application
│   ├── alembic/              # Database migration scripts
│   ├── app/
│   │   ├── ai/               # RAG, embeddings, chunking & retrieval pipelines
│   │   ├── api/v1/           # API router definitions
│   │   ├── core/             # Database config, auth, middleware & logging
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── modules/          # Domain services (comparison, recommendations, etc.)
│   │   └── main.py           # Application entry point
│   ├── seed/                 # Database seed data & JSON files
│   ├── tests/                # PyTest suite
│   ├── requirements.txt      # Python dependencies
│   └── README.md             # Backend documentation
├── frontend/                 # React + TypeScript Frontend Application
│   ├── src/
│   │   ├── components/       # Shared UI components & layout controls
│   │   ├── config/           # API client configuration
│   │   ├── features/         # Feature modules (auth, comparison, recommendations)
│   │   ├── pages/            # Page-level components
│   │   └── store/            # Redux store configuration
│   ├── package.json          # Node dependencies
│   └── README.md             # Frontend documentation
└── README.md                 # Root project documentation (this file)
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Python**: 3.12+
- **Node.js**: 18+ / npm 10+
- **PostgreSQL**: 15+ with `pgvector` extension enabled (`CREATE EXTENSION IF NOT EXISTS vector;`)

---

### 1. Database Setup
Create PostgreSQL database:
```sql
CREATE DATABASE insuretech;
\c insuretech
CREATE EXTENSION IF NOT EXISTS vector;
```

---

### 2. Backend Installation & Setup

```bash
cd insuretech/backend

# Create & activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment configuration
cp .env.example .env
```

Configure `insuretech/backend/.env`:
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/insuretech
SECRET_KEY=your_super_secret_jwt_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
EMBEDDING_MODEL=BAAI/bge-base-en-v1.5

FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development
LOG_LEVEL=INFO
```

Run migrations & start backend server:
```bash
# Apply database migrations
alembic upgrade head

# Seed initial data (optional)
python seed/seed.py

# Start FastAPI dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API Documentation will be accessible at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

### 3. Frontend Installation & Setup

```bash
cd insuretech/frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Configure `insuretech/frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```

Start frontend dev server:
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🧪 Testing

Run backend unit tests:
```bash
cd insuretech/backend
PYTHONPATH=. .venv/bin/pytest tests/
```

---

## 📄 License & Attribution

InsureTech is developed for enterprise business insurance profiling and policy analysis. Proprietary & Confidential. All Rights Reserved.
