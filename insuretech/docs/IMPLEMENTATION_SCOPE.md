# Implementation Scope

> Project governance document. Defines what has been built, what is being built, what will be built, and what will not be built. All developers and AI coding agents must operate within these boundaries.

---

## Current Project Phase

**Core Backend Development · Core Frontend Development (Active)**

The backend has foundational infrastructure (database, migrations, models, logging, middleware, exception handling) and three complete modules (auth, admin, contact). The frontend has the application shell (routing, store, API client), a complete auth feature, and two admin pages. Six backend modules and all AI components remain as empty stubs. Tests exist as empty files only.

**Evidence:**
- 15 migrations applied to PostgreSQL schema with 22 model files
- 3 of 9 backend modules fully implemented (auth, admin, contact)
- 7 backend modules are empty stubs (businesses, profiling, risk_assessment, chat, policies, recommendations, reports)
- All AI module files are empty
- Frontend has auth flow complete, admin pages complete, landing page complete
- All test files are empty
- Active git branch: `feature/business-profiling` (currently checked out locally)
- Remote branches indicate completed features: `feature/admin-module`, `feature/auth-module`, `feature/auth-frontend`, `feature/landing-page`, `feature/db-schema`, `feature/utils`

---

## Completed Features

### Backend

| Feature | Details | Evidence |
|---|---|---|
| **Database Models** | 22 ORM models covering users, roles, industries, segments, risk factors, questions, business profiles, profiling sessions, answers, risk scores, policies, recommendations, reports, documents, chunks, password reset tokens, audit logging | `backend/app/models/` — 541 total lines across 22 files |
| **Database Migrations** | 15 Alembic migration files establishing the full schema with naming conventions, UUID PKs, TimestampMixin, AuditMixin, relationships | `backend/alembic/versions/` — 15 migration files |
| **Auth Module** | Registration, login, logout, token refresh, change password, forgot password, reset password, current user profile | `backend/app/modules/auth/` — router, service, repository, schemas, JWT helper, cookie helper, password hashing |
| **Admin Module** | Dashboard stats (total/active/inactive users), paginated user list, user status toggle (activate/deactivate) | `backend/app/modules/admin/` — router, service, repository, schemas |
| **Contact Module** | Contact form submission with email notification and in-memory rate limiting (5 req / 15 min per IP) | `backend/app/modules/contact/` — router, service, repository, schemas |
| **CORS Middleware** | CORS configured for frontend origin with credentials support | `backend/app/core/middleware.py` |
| **Exception Handling** | Global handlers for 400/401/404/409/422/500 with standard `APIResponse` envelope | `backend/app/core/exceptions.py` — 8 handlers |
| **Logging** | Structured stdout logging with configurable `LOG_LEVEL` | `backend/app/core/logging.py` |
| **Email Service** | Password reset emails and contact form notifications via `fastapi-mail` | `backend/app/core/mail.py` |
| **Seed Scripts** | Admin/USER role seeding (`seed.py`), underwriting wizard data seeding from JSON (`seed_wizard.py`) | `backend/seed.py`, `backend/seed_wizard.py`, `backend/master_seed_final.json` |
| **API Router Aggregation** | Centralized v1 router at `app/api/v1/router.py` | Wires auth, admin, contact routers |

### Frontend

| Feature | Details | Evidence |
|---|---|---|
| **Application Shell** | Redux store, shared Axios instance with `withCredentials`, React Router with route guards | `main.tsx`, `App.tsx`, `store/store.ts`, `api/baseApi.ts` |
| **Auth Feature** | Login, register, forgot password, reset password forms with Zod validation, Redux slice, API layer | `frontend/src/features/auth/` — 24 files |
| **Auth Modal** | Dual-mode auth overlay (modal on landing page, full-page on direct navigation) with tab syncing | `features/auth-modal/AuthModal.tsx` |
| **Admin Pages** | Dashboard with stats cards, user management with pagination and status toggle | `pages/AdminDashboardPage.tsx`, `pages/AdminUsersPage.tsx` |
| **User Dashboard** | Profile details page for authenticated users | `pages/DashboardPage.tsx` |
| **Landing Page** | Full landing page with insurance category carousel, contact form, auth modal trigger | `pages/HomePage.tsx` (1172 lines) |
| **Route Guards** | `ProtectedRoute` (auth check), `AdminRoute` (admin role check) | `Routes/ProtectedRoute.tsx`, `Routes/AdminRoute.tsx` |
| **Custom Hooks** | `useAuth` (Redux wrapper), `useSessionCheck` (session validation on load) | `hooks/useAuth.ts`, `hooks/useSessionCheck.ts` |
| **Shared Components** | Button, Input (with forwardRef, error state, right element slot), Checkbox — each with CSS Module | `components/Button/`, `components/Input/`, `components/Checkbox/` |
| **Design Tokens** | CSS custom properties for brand colors, risk status colors, surfaces, text, borders, focus rings, shadows | `styles/variable.css` |

---

## In Progress Features

**Unable to determine from codebase with certainty.**

The locally checked-out branch is `feature/business-profiling`. However:

- `backend/app/modules/businesses/` contains only empty stubs (all 4 files are 0 bytes)
- No `businesses/` directory exists under `frontend/src/features/`
- No commit messages mention business profiling implementation

**Conclusion**: The branch name suggests business profiling is the next intended work item, but no implementation has begun. The branch may be a recent checkout with no commits.

---

## Planned Future Features

The following modules have directory structures and/or model files that indicate they are intended for future implementation. They are listed in order of apparent priority based on existing scaffold state.

| Module | Backend State | Frontend State | Migrations Ready |
|---|---|---|---|
| **Business Profiling** | Empty stubs (router, service, repository, schemas — all 0 bytes) | Not created | Yes — `business_profiles` table exists |
| **Risk Profiling** | Empty stubs (router, service, repository all 0 bytes). `schemas.py` has partial `OptionItem`, `QuestionOut` models. | Not created | Yes — `profiling_sessions`, `profiling_answers`, `question_factor_mappings`, `answer_score_rules` tables exist |
| **Risk Assessment (AHP)** | Empty stubs (router, service, repository, schemas, ahp_engine, tasks — all 0 bytes) | Not created | Yes — `business_risk_scores` table exists |
| **Policies** | Empty stubs (router, service, repository — all 0 bytes). No schemas file. | Not created | Yes — `policies` table exists with `policy_documents` and `document_chunks` |
| **Recommendations** | Empty stubs (router, service, repository, schemas — all 0 bytes) | Not created | Yes — `recommendations` table exists |
| **Insurance Chat** | Empty stubs (router, service, schemas, mongo_repository — all 0 bytes) | Not created | Partial — MongoDB dependency declared but no MongoDB tables/migrations |
| **Reports** | Empty stubs (router, service, repository, schemas, tasks — all 0 bytes) | Not created | Yes — `reports` table exists |

### AI/LLM Module (Future)

All files under `backend/app/ai/` are empty stubs:

| Component | State |
|---|---|
| `llm_providers.py` | Empty (0 bytes) |
| `rag_pipeline.py` | Empty (0 bytes) |
| `embeddings.py` | Empty (0 bytes) |
| `document_loader.py` | Empty (0 bytes) |
| `graphs/risk_graph.py` | Directory exists, no file |
| `prompts/risk_prompts.py` | Directory exists, no file |
| `prompts/report_prompts.py` | Directory exists, no file |
| `prompts/chat_prompts.py` | Directory exists, no file |

Dependencies are declared in `requirements.txt`: `langchain`, `langchain-community`, `langchain-google-genai`, `groq`, `langgraph`, `pgvector`.

### Known TODOs in Codebase

All 3 TODOs are in the frontend auth module:

| File | Line | TODO | Status |
|---|---|---|---|
| `features/auth/refreshTimer.ts` | 16 | Enable timer after refresh endpoint is implemented | Blocked on backend |
| `features/auth/authSlice.ts` | 76 | Backend logout endpoint is pending | Blocked on backend |
| `features/auth/authApi.ts` | 59 | Enable token refresh retry logic after refresh API is ready | Blocked on backend |

---

## Current Technical Scope

### Approved Technologies (In Use)

#### Backend

| Technology | Purpose | Evidence |
|---|---|---|
| Python 3.12 | Runtime | `requirements.txt`, `.python-version` |
| FastAPI | Web framework | `app/main.py`, router files |
| Uvicorn | ASGI server | `requirements.txt` |
| SQLAlchemy 2.x (async) | ORM | `core/database.py`, model files |
| asyncpg | PostgreSQL async driver | `requirements.txt` |
| Alembic | Database migrations | `alembic/` directory, 15 migration files |
| Pydantic v2 | Schema validation | All `schemas.py` files |
| Pydantic Settings | Environment config | `core/config.py` |
| python-jose | JWT tokens | `auth/jwt_halper.py` |
| passlib (bcrypt) | Password hashing | `auth/password_hashing.py` |
| structlog | Logging | `core/logging.py` (declared but basic logging used) |
| fastapi-mail | Email sending | `core/mail.py` |
| pytest + pytest-asyncio + httpx | Testing infrastructure | `requirements.txt`, `tests/` directory |
| pgvector | Vector embeddings (declared) | `requirements.txt`, `models/document_chunks.py` |

#### Frontend

| Technology | Purpose | Evidence |
|---|---|---|
| TypeScript 6.x | Language | `tsconfig.json`, `package.json` |
| React 19 | UI library | `package.json` |
| Vite 8 | Build tool | `vite.config.ts`, `package.json` |
| Redux Toolkit | Global state | `store/store.ts`, `authSlice.ts` |
| React Router DOM 7 | Routing | `App.tsx`, route guard files |
| React Hook Form | Form state | `LoginForm.tsx`, `RegisterForm.tsx` |
| Zod 4 | Schema validation | `validation/*.schema.ts` |
| Axios | HTTP client | `api/baseApi.ts`, `authApi.ts` |
| Tailwind CSS 3 | Utility styling | `tailwind.config.js`, `index.css` |
| CSS Modules | Component scoped styling | `*.module.css` files |
| CSS Custom Properties | Design tokens | `styles/variable.css` |
| MUI 9 (Material UI) | UI components (declared) | `package.json` (not yet used in components) |
| Framer Motion | Animation | `package.json` (not yet used in components) |
| Recharts | Charts | `package.json` (not yet used) |

### Approved Architecture

| Pattern | Status | Evidence |
|---|---|---|
| Modular Monolith | In use | `backend/app/modules/` |
| Layered Architecture (Router → Service → Repository) | In use | All 3 complete modules follow this |
| Singleton Service Pattern | In use | `Service = AuthService()` at module level |
| Flat Repository Functions | In use | Repository files use top-level async functions |
| Standardized API Response Envelope | In use | `APIResponse.success_response()` / `error_response()` |
| JWT Auth via HttpOnly Cookies | In use | `cookie_helper.py`, `get_current_user.py` |
| RBAC (Role-Based Access) | In use | `role_required.py`, admin routes |
| Feature-Based Frontend Organization | In use | `frontend/src/features/auth/` |
| CSS Custom Property Theming | In use | `styles/variable.css` referenced in CSS Modules |

---

## Out of Scope

The following technologies and patterns are NOT part of the current project scope. Do not introduce them unless explicitly instructed by a project lead.

| Technology | Reason |
|---|---|
| **Kubernetes** | No container orchestration needed. Single-process monolith. |
| **Microservices** | Architecture is explicitly a modular monolith. |
| **Event Sourcing** | No event store or event log exists or is planned. |
| **Kafka / Message Queue** | No asynchronous message bus exists or is required. |
| **GraphQL** | REST/JSON API is the established pattern. No GraphQL schema or resolver exists. |
| **WebSockets** | No real-time requirements. All communication is request-response. |
| **gRPC** | No inter-service communication exists (monolith). |
| **CQRS** | Single-model SQLAlchemy ORM. No read/write split. |
| **Service Mesh** | Single service. No mesh infrastructure. |
| **Redis** | Not used for caching, sessions, or rate limiting. |
| **Docker** | No Dockerfile or docker-compose.yml exists. |
| **CI/CD Pipelines** | No GitHub Actions, GitLab CI, or Jenkins configuration exists. |
| **Terraform / Infrastructure-as-Code** | No IaC files exist. |
| **Sentry / APM** | No application monitoring or error tracking configured. |
| **OAuth / SSO** | Auth is username/password + JWT. No OAuth provider integration. |
| **MongoDB** | Client library declared (`motor`, `pymongo`) but no connection, model, or migration exists. All code using MongoDB (`mongodb.py`, `get_mongo_db.py`, `chat/mongo_repository.py`) is empty. |

---

## Deferred Engineering Work

The following items would be valuable but are NOT part of the current implementation phase. AI agents must not implement these unless explicitly requested.

| Item | Status | Evidence |
|---|---|---|
| **Unit Tests** | NOT STARTED | `backend/tests/unit/` — 3 empty `.py` files (0 bytes each) |
| **Integration Tests** | NOT STARTED | `backend/tests/integration/` — 3 empty `.py` files (0 bytes each) |
| **API Tests** | NOT STARTED | No API test files exist anywhere |
| **Frontend Tests** | NOT STARTED | `frontend/src/test/` contains only a README. No test files. `@testing-library/react` is in dev dependencies but unused |
| **CI/CD Pipeline** | NOT STARTED | No CI configuration files in repository |
| **End-to-End Testing** | NOT STARTED | No Playwright, Cypress, or similar configuration |
| **Performance Testing** | NOT STARTED | No k6, locust, or similar configuration |
| **Load Testing** | NOT STARTED | No load test scripts |
| **Monitoring / APM** | NOT STARTED | No Sentry, Datadog, or similar integration |
| **Distributed Tracing** | NOT STARTED | No OpenTelemetry or similar setup |
| **Caching Layer** | NOT STARTED | No Redis, Memcached, or in-memory cache beyond contact rate limiter dict |
| **Background Job Queue** | NOT STARTED | No Celery, Arq, or similar. `background_tasks` (FastAPI) used for email only. `risk_assessment/tasks.py` and `reports/tasks.py` are empty stubs |
| **API Documentation UI** | NOT STARTED | FastAPI includes auto-generated `/docs` and `/redoc` but no custom documentation UI is configured |
| **Rate Limiting (General)** | PARTIALLY IMPLEMENTED | Only contact form has in-memory per-IP rate limiting. No general middleware exists |
| **Refresh Token Rotation** | NOT STARTED | Refresh tokens are never invalidated server-side after use |
| **Logging Enhancement** | PARTIALLY IMPLEMENTED | Basic stdout logging exists. Structured logging (structlog) is in dependencies but basic `logging` module is used instead |
| **Documentation Content** | NOT STARTED | All 5 docs files are 3-4 line stubs. `ARCHITECTURE_GUIDE.md`, `FRONTEND_ARCHITECTURE.md`, `API_CONTRACTS.md` now exist at root level but are newly created |

---

## AI Agent Operating Rules

### Boundaries

1. **Do not modify database schema unless explicitly instructed.** Schema changes require Alembic migrations. Do not alter existing model files or create new models as part of feature implementation unless the task explicitly requires new tables.

2. **Do not introduce new architectural patterns.** The project uses:
   - Modular monolith (not microservices)
   - Layered pattern (Router → Service → Repository)
   - Singleton services
   - Flat repository functions
   - `APIResponse` envelope
   - JWT in HttpOnly cookies
   - Redux Toolkit for global auth state
   - React Hook Form + Zod for forms
   - CSS Modules + Tailwind for styling

   Any deviation requires explicit approval.

3. **Do not add new dependencies.** All required dependencies are declared in `backend/requirements.txt` and `frontend/package.json`. Adding a new dependency requires a documented justification.

4. **Do not refactor unrelated modules.** When implementing a feature in Module A, do not modify or restructure Module B, C, or D.

5. **Do not create features outside assigned scope.** If the task is to implement the `profiling` module, do not also implement `risk_assessment`, `chat`, or any other module.

6. **Do not implement deferred engineering work unless specifically requested.** Do not write tests, set up CI/CD, add monitoring, or implement caching unless the task explicitly requires it.

7. **Do not modify or delete existing API contracts.** Existing endpoint paths, request schemas, response schemas, and status codes are immutable. Breaking changes require a new API version.

### Compliance

8. **Respect existing module boundaries.**
   - A module's `repository.py` is private — only the owning module's Service may import it.
   - A module's `service.py` is the public API — other modules may only import `service.py`.
   - A module's `router.py` is consumed only by `app/api/v1/router.py`.
   - Models must be imported from `app.models`, not from within modules.

9. **Respect existing coding standards.**
   - Services are module-level singletons: `Service = ClassName()`.
   - Repositories are stateless async functions taking `db: AsyncSession` as first argument.
   - Every endpoint returns `APIResponse.success_response()` or `APIResponse.error_response()`.
   - Errors are raised as custom exceptions, not returned inline.
   - Every router has a `prefix` and `tags`.

10. **Respect existing frontend conventions.**
    - Pages are route-level only — they may not be imported by other pages.
    - Shared components (`components/`) may not import from `features/` or `store/`.
    - API logic must live in feature API modules, not in components.
    - Form validation uses Zod schemas in `features/<name>/validation/`.
    - Types are centralized in `*.types.ts` files.

11. **Respect the architecture documents.** `ARCHITECTURE_GUIDE.md`, `FRONTEND_ARCHITECTURE.md`, and `API_CONTRACTS.md` are authoritative. If there is a conflict between an architecture document and observed code, the architecture document takes precedence.

12. **Do not speculate.** If a design decision is unclear, ask. Do not invent requirements, error messages, response fields, or validation rules.

### Module Implementation

13. **When implementing a new module, implement all four files fully.** A module is `router.py`, `service.py`, `repository.py`, and `schemas.py`. Do not leave empty functions or placeholder handlers.

14. **Follow the existing module pattern.** Study the `auth` module as the reference implementation for:
    - Router registration and dependency injection
    - Service error handling and response formatting
    - Repository query patterns
    - Schema validation rules

---

## Definition of Done

A module is considered complete only when ALL of the following are true:

| Criterion | Description | Evidence Required |
|---|---|---|
| **Schemas** | All Pydantic request/response models defined in `schemas.py` | File exists and is non-empty |
| **Repository** | All database access functions implemented with async SQLAlchemy | File exists, functions are non-trivial, use `select()` / `execute()` / `commit()` |
| **Service** | All business logic implemented. Custom exceptions raised for error paths. Responses use `APIResponse`. | File exists, class implements all required operations |
| **Router** | All HTTP endpoints registered with correct method, path, status code, tags, and `Depends()` injections | File exists, each endpoint has `@router.get/post/patch/delete` |
| **Router Registration** | Module router imported in `app/api/v1/router.py` | `router.py` imports and `include_router` call added |
| **Validation** | Request validation via Pydantic `@field_validator` / `@model_validator` in schemas | Validation methods exist in schema classes |
| **Logging** | Service-level errors logged via `get_logger(__name__)` | Logger calls exist in service or repository |
| **Security** | Auth and role guards applied where appropriate | `Depends(get_current_user)` or `Depends(role_required(...))` on protected routes |
| **Architecture Compliance** | Layer boundaries respected. No cross-module repository imports. No business logic in routers or repositories. | Manual review confirms layering |
| **No Empty Handlers** | Every function has a real implementation | No `pass` or `return None` placeholder functions |

Tests, CI/CD, monitoring, documentation, and performance optimization are NOT required for module completion. These are deferred engineering work.

---

## Source of Truth

When documentation conflicts, the following precedence applies:

| Priority | Document | Authority |
|---|---|---|
| 1 | **Database Migrations** (`alembic/versions/`) | Actual database schema — ground truth |
| 2 | **Database Models** (`app/models/`) | ORM representation of schema |
| 3 | **Agent Contract** (`AGENTS.md`) | Consolidated agent operating rules |
| 4 | **Architecture Guide** (`ARCHITECTURE_GUIDE.md`) | Architectural rules and conventions |
| 5 | **API Contracts** (`API_CONTRACTS.md`) | Endpoint contracts and data shapes |
| 6 | **Frontend Architecture** (`FRONTEND_ARCHITECTURE.md`) | Frontend structure and conventions |
| 7 | **Implementation Scope** (`IMPLEMENTATION_SCOPE.md`) | Project boundaries and phase definitions |
| 8 | **Existing Code** (`.py`, `.ts`, `.tsx` files) | Reference implementation |
| 9 | **README / Docs** (`docs/`, `README.md`) | Supplemental context (currently stubs only) |
