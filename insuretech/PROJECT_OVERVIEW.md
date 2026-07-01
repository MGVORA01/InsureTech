# InsureTech — Project Overview

> **Scope**: This document is the authoritative source of truth for the InsureTech project. Written for senior engineers onboarding to the codebase.

---

## Project Purpose

InsureTech is a digital insurance advisory platform that guides businesses through a structured risk-profiling questionnaire, computes risk scores across multiple categories using configurable scoring rules, and recommends suitable insurance policies. The platform supports role-based access (USER, ADMIN) and is designed to eventually incorporate LLM-powered risk analysis, RAG-based policy Q&A, and automated report generation.

---

## Problem Statement

Small and medium businesses lack a structured, data-driven way to assess their risk profile and identify appropriate insurance coverage. Insurance advisory is currently manual, opaque, and not easily scalable. The platform aims to digitize and systematize this process through a configurable underwriting wizard, a scoring engine, and a recommendation layer.

---

## Business Goals

- **Democratize risk assessment**: Provide a self-service digital profiling experience for businesses.
- **Standardize underwriting logic**: Replace ad-hoc advisory with configurable question-to-factor-to-score mappings.
- **Enable data-driven recommendations**: Score businesses against risk categories and surface relevant insurance policies.
- **Scale insurance distribution**: Act as a digital intermediary between businesses and insurers.
- **Admin governance**: Allow platform administrators to manage users, monitor activity, and maintain data integrity.

---

## Core Features

| Feature | Status |
|---------|--------|
| User registration & login | Implemented |
| JWT-based authentication with httpOnly cookies | Implemented |
| Password reset via email | Implemented |
| Role-based access control (USER / ADMIN) | Implemented |
| Admin dashboard (user statistics, user management) | Implemented |
| Contact form | Implemented |
| Landing/marketing page | Implemented |
| Business profiling wizard (questions, conditional branching) | Not Yet Implemented |
| Risk scoring engine (AHP-based) | Not Yet Implemented |
| Insurance policy catalog & management | Not Yet Implemented |
| Business profile CRUD | Not Yet Implemented |
| Insurance recommendation engine | Not Yet Implemented |
| Report generation (PDF) | Not Yet Implemented |
| AI-powered chat assistant (RAG on policy documents) | Not Yet Implemented |
| LLM-based risk analysis pipeline (LangGraph) | Not Yet Implemented |
| Policy document ingestion & vector search (pgvector) | Not Yet Implemented |
| Unit & integration tests | Not Yet Implemented |

---

## User Roles

### USER
- Register and manage their account.
- Complete business profiling questionnaires.
- View risk assessment results and policy recommendations.
- Access generated reports.

### ADMIN
- All USER permissions (implicitly, via shared session validation).
- View aggregated platform statistics (total / active / inactive users).
- List, filter, and deactivate/reactivate user accounts.

---

## Technology Stack

### Backend Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Python | 3.12 |
| Framework | FastAPI | (latest via pip) |
| ASGI Server | Uvicorn | (latest) |
| ORM | SQLAlchemy (async) | 2.x |
| Migrations | Alembic | (latest) |
| Auth | python-jose (JWT) + passlib (bcrypt) | (latest) |
| Validation | Pydantic v2 | (latest) |
| Mail | fastapi-mail | (latest) |
| Logging | structlog | (latest) |

### Frontend Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | (latest LTS) |
| Framework | React | 19.2.6 |
| Build Tool | Vite | 8.0.12 |
| Language | TypeScript | 6.0.2 |
| State Management | Redux Toolkit | 2.12.0 |
| Server State | TanStack React Query | 5.101.0 |
| Routing | React Router DOM | 7.17.0 |
| UI Library | MUI (Material-UI) | 9.1.1 |
| Styling | Tailwind CSS | 3.4.19 |
| Forms | React Hook Form + Zod | 7.78 / 4.4 |
| Animation | Framer Motion | 12.40.0 |
| Charts | Recharts | 3.8.1 |
| HTTP Client | Axios | 1.17.0 |
| Linting | ESLint | 10.3.0 |

### Database Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Primary DB | PostgreSQL | Relational data (users, businesses, profiling, risk, policies) |
| Vector Extension | pgvector | Embedding storage (768-dim) for document chunks |
| Migrations | Alembic | Schema versioning |
| Secondary DB | MongoDB (via Motor) | Not Yet Implemented — placeholder stub only |

### Deployment Stack

| Component | Status |
|-----------|--------|
| Containerization (Docker) | Not Yet Implemented |
| Docker Compose | Not Yet Implemented |
| CI/CD Pipeline | Not Yet Implemented |
| Production Server | Not Yet Configured |
| Monitoring / Observability | Not Yet Implemented |

### External Services

| Service | Purpose | Status |
|---------|---------|--------|
| SMTP Mail Server | Send password reset and contact emails | Configured via `app/core/mail.py` |
| Cloudinary | Document/image upload & storage | Dependency listed, Not Yet Implemented |
| Groq (LLM) | AI inference for chat and risk analysis | Dependency listed, Not Yet Implemented |
| Google Generative AI | LLM inference (LangChain integration) | Dependency listed, Not Yet Implemented |

---

## Module Ownership

Ownership is not formally assigned. Modules are organized by domain:

| Module | Path | State |
|--------|------|-------|
| **auth** | `backend/app/modules/auth/` | Implemented (router, service, repository, schemas, JWT, password hashing, cookie helpers) |
| **admin** | `backend/app/modules/admin/` | Implemented (dashboard stats, user listing, status toggle) |
| **contact** | `backend/app/modules/contact/` | Implemented (form submission + email dispatch) |
| **businesses** | `backend/app/modules/businesses/` | Empty stubs |
| **profiling** | `backend/app/modules/profiling/` | Stub with `schemas.py` partially filled |
| **risk_assessment** | `backend/app/modules/risk_assessment/` | Empty stubs (includes `ahp_engine.py`) |
| **recommendations** | `backend/app/modules/recommendations/` | Empty stubs |
| **reports** | `backend/app/modules/reports/` | Empty stubs (includes `tasks.py`) |
| **policies** | `backend/app/modules/policies/` | Empty stubs |
| **chat** | `backend/app/modules/chat/` | Empty stubs (includes `mongo_repository.py`) |
| **ai** | `backend/app/ai/` | Empty stubs (LLM, embeddings, RAG, LangGraph, prompts) |

Frontend feature parity follows the same pattern — only `auth/`, `auth-modal/`, and `contact/` are implemented. Profiling, risk assessment, recommendations, reports, policies, and chat features are absent from the frontend.

---

## High-Level Data Flow

```
User (Browser)
  │
  ├─▶ [React App] ──▶ [Redux Store] ──▶ [Axios API Client]
  │                                              │
  │                                              ▼
  │                                    FastAPI Backend (Uvicorn)
  │                                              │
  │                              ┌───────────────┼───────────────┐
  │                              ▼               ▼               ▼
  │                        auth/           admin/          contact/
  │                     (register,      (stats, users,   (send email)
  │                      login,           status toggle)
  │                      password
  │                      reset)
  │                              │               │               │
  │                              ▼               ▼               ▼
  │                        PostgreSQL (async SQLAlchemy)
  │                              │
  │                     [Planned: profiling wizard ──▶ risk scoring ──▶ recommendations ──▶ reports]
  │                     [Planned: policy documents ──▶ pgvector embeddings ──▶ RAG Q&A]
  │                     [Planned: MongoDB for chat history / analytics]
  │
  └─▶ [SMTP Mail Server] ◀────── contact / password-reset flows
```

**Request flow per endpoint**:

1. Request enters via Uvicorn → FastAPI middleware (CORS) → Exception handlers.
2. Router-level dependency injection: `get_current_user` (JWT cookie → DB lookup), `role_required` (role check).
3. Route handler calls service method → repository method → async SQLAlchemy session.
4. Response returned as `APIResponse` envelope (`{success, error, message, data}`).

---

## Project Constraints

- The platform uses a **dual-database architecture** (PostgreSQL for transactions, MongoDB for analytics/chat) as documented in ADR-001, but **the MongoDB connection is not implemented** — only a stub exists at `app/core/mongodb.py`.
- **No test coverage exists**. The `backend/tests/` directory contains empty placeholder files only.
- **AI/LLM pipeline is fully stubbed**. Despite having LangChain, LangGraph, Groq, and Google GenAI in dependencies, no AI code is wired into the application.
- **No task queue** (Celery / Redis / ARQ). The `tasks.py` stubs in `reports/` and `risk_assessment/` are empty. Any long-running or background work cannot be scheduled.
- **No caching layer** (Redis, Memcached, or in-memory). Every authenticated request re-queries the database.
- **No rate limiting** on any endpoint (auth or otherwise).
- **No Dockerfile or containerization** — deployment environment is undefined.
- **No CI/CD pipeline** — no build, test, or deploy automation.
- **pgvector extension is required** at the database level but is only referenced in the Alembic migration (`45cb78b78a4e`). No application code ingests or queries embeddings.
- The frontend **Tailwind config** uses custom CSS variables for theming (primary, secondary, cta, risk colors) — ensure these tokens are synchronized with any design system changes.

---

## Non-Goals

- **Multi-tenancy**: The schema does not support tenant isolation. All users exist in a single namespace.
- **Real-time features**: No WebSocket, SSE, or polling-based live updates are implemented or planned.
- **Payment processing**: No subscription, billing, or payment gateway integration exists.
- **Regulatory compliance**: No SOC 2, GDPR, or IRDAI-specific compliance attestation code exists.
- **Mobile apps**: No native mobile clients. The frontend is browser-only (responsive).
- **API versioning beyond `/api/v1`**: No version negotiation or deprecation strategy is implemented.
- **Internationalization (i18n)**: All UI text is hardcoded in English.
- **SSO / OAuth / social login**: Only email-password registration is supported.
- **Analytics dashboard**: Admin dashboard provides basic user counts only — no funnel, retention, or business metrics.

---

## Source of Truth

| Aspect | Location |
|--------|----------|
| API contract | `backend/app/modules/*/schemas.py`, `backend/app/modules/*/router.py` |
| Database schema | `backend/app/models/*` (ORM), `backend/alembic/versions/` (migrations) |
| Frontend routes & pages | `frontend/src/App.tsx`, `frontend/src/pages/` |
| Redux state shape | `frontend/src/store/store.ts`, `frontend/src/features/*/authSlice.ts`, `passwordSlice.ts` |
| Backend config / env vars | `backend/app/core/config.py`, `backend/.env.example` |
| Frontend config / env vars | `frontend/.env.example` |
| Seed data (wizard questions, scoring) | `backend/master_seed_final.json` |
| Architecture decisions | `docs/decisions/ADR-001-db-split.md` |
| Python dependencies | `backend/requirements.txt` |
| Node dependencies | `frontend/package.json` |
| This document | `PROJECT_OVERVIEW.md` |

---

## Future Scalability Considerations

- The **module-per-directory** pattern (router, service, repository, schemas) cleanly supports vertical slicing for independent deployment or team ownership.
- The **generic API response envelope** (`APIResponse<DataT>`) enables consistent client-side error handling across all endpoints without per-endpoint adaptation.
- **pgvector** support is wired at the Alembic level, enabling semantic search without additional infrastructure when the RAG pipeline is implemented.
- The **question-factor-score triple** abstraction (questions → factor mappings → answer score rules) decouples the questionnaire from the scoring engine, allowing domain experts to modify risk logic via seed data without code changes.
- The **ADR pattern** in `docs/decisions/` is established and should be continued for all future architectural decisions.
- Frontend **feature modules** mirror backend modules — this convention should be maintained to preserve a clear mental model of the bounded context.
- No load-balancing, horizontal scaling, read-replica, or connection-pooling strategy is configured — these will be required before production deployment.
