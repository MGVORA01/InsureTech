# InsureTech Architecture Guide

> Architecture contract for developers and AI coding agents.

---

## Architectural Style

**Modular Monolith with Layered Architecture inside each Module.**

The system is deployed as a single FastAPI application (monolith), but the codebase is organized into isolated business modules. Each module follows a strict **Router -> Service -> Repository** layering. The frontend is a decoupled React SPA communicating via HTTP/JSON.

---

## Modular Monolith Explanation

The system is a monolith because:

- One ASGI process serves all endpoints (`uvicorn app.main:app`).
- All modules share the same database, the same SQLAlchemy engine, and the same process memory.

It is _modular_ because:

- Each business capability (auth, profiling, policies, etc.) lives in its own directory under `backend/app/modules/`.
- Modules communicate exclusively through **Service calls** (direct import of another module's Service). They never share internal implementation details.
- The module boundary is enforced by convention: a module's `router.py` and `repository.py` are private. Only `service.py` may be imported by other modules.
- Any module can be extracted into a separate microservice in the future by exposing its Service as an HTTP/gRPC API — no code changes inside the module's core logic are required.

---

## Backend Folder Structure

```
backend/
├── main.py                        # Alternative entry point
├── requirements.txt
├── alembic.ini
├── alembic/                       # Database migrations
│   └── versions/
│
└── app/
    ├── main.py                    # FastAPI app factory
    ├── core/                      # Cross-cutting infrastructure
    │   ├── config.py              # Pydantic Settings (env vars)
    │   ├── database.py            # SQLAlchemy engine, async session factory, get_db
    │   ├── exceptions.py          # Custom exceptions + global handlers
    │   ├── logging.py             # Stdout logging
    │   ├── middleware.py          # CORS, middleware
    │   ├── mail.py                # Email client (fastapi-mail)
    │   ├── mongodb.py             # MongoDB placeholder
    │   └── security.py            # Security utilities placeholder
    │
    ├── models/                    # SQLAlchemy ORM models (shared across modules)
    │   ├── __init__.py            # Re-exports all models
    │   ├── audit_log.py           # AuditMixin, TimestampMixin
    │   ├── users.py
    │   ├── roles.py
    │   └── ...                    # One file per entity
    │
    ├── shared/                    # Reusable shared components
    │   ├── base_model.py          # SQLAlchemy Base with naming convention
    │   ├── response.py            # APIResponse envelope
    │   ├── dependency/            # FastAPI dependencies
    │   │   ├── get_current_user.py
    │   │   └── role_required.py
    │   ├── base_repository.py     # Placeholder for base CRUD
    │   ├── paginator.py           # Placeholder
    │   └── dependencies.py        # Placeholder
    │
    ├── api/
    │   └── v1/
    │       └── router.py          # Aggregates all module routers
    │
    ├── modules/                   # Feature modules
    │   ├── auth/                  # Registration, login, JWT, password mgmt
    │   │   ├── router.py
    │   │   ├── service.py
    │   │   ├── repository.py
    │   │   ├── schemas.py
    │   │   ├── jwt_halper.py
    │   │   ├── cookie_helper.py
    │   │   ├── password_hashing.py
    │   │   └── constants.py
    │   │
    │   ├── admin/                 # Admin dashboard, user management
    │   │   ├── router.py
    │   │   ├── service.py
    │   │   ├── repository.py
    │   │   └── schemas.py
    │   │
    │   ├── contact/               # Contact form
    │   │   ├── router.py
    │   │   ├── service.py
    │   │   ├── repository.py
    │   │   └── schemas.py
    │   │
    │   ├── businesses/
    │   ├── profiling/
    │   ├── risk_assessment/
    │   ├── chat/
    │   ├── policies/
    │   ├── recommendations/
    │   └── reports/
    │
    ├── ai/                        # AI/LLM components
    │   ├── llm_providers.py
    │   ├── rag_pipeline.py
    │   ├── embeddings.py
    │   ├── document_loader.py
    │   ├── graphs/
    │   └── prompts/
    │
    └── utils/
        └── helpers.py
```

---

## Frontend Folder Structure

```
frontend/
├── index.html
├── vite.config.ts
├── package.json
├── tsconfig*.json
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
│
└── src/
    ├── main.tsx                   # App bootstrap
    ├── App.tsx                    # Root component + routing
    ├── index.css                  # Global styles
    │
    ├── api/                       # HTTP client layer
    │   └── baseApi.ts             # Shared Axios instance, interceptors
    │
    ├── store/                     # Redux store
    │   └── store.ts
    │
    ├── features/                  # Feature modules (domain slices)
    │   ├── auth/                  # Auth Redux slice, forms, validation
    │   └── contact/               # Contact form API
    │
    ├── components/                # Reusable UI primitives
    │   ├── Button/
    │   ├── Checkbox/
    │   └── Input/
    │
    ├── hooks/                     # Custom React hooks
    ├── layout/                    # Layout components
    ├── pages/                     # Page-level components
    ├── Routes/                    # Route guards (ProtectedRoute, AdminRoute)
    ├── styles/                    # CSS variables, design tokens
    ├── types/                     # Shared TypeScript types
    ├── constants/                 # App-wide constants
    └── assets/                    # Static assets
```

---

## Dependency Flow

```
Request
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│  ROUTER  (FastAPI APIRouter)                                    │
│  • Maps HTTP methods to handlers                                │
│  • Validates input via Pydantic schemas                         │
│  • Calls Service method                                         │
│  • Returns APIResponse                                          │
├─────────────────────────────────────────────────────────────────┤
│  ▲ Only Depends() for DI                                        │
│  │                                                              │
│  ▼                                                              │
│  SERVICE  (Business logic)                                      │
│  • Orchestrates business rules                                  │
│  • Calls Repository functions                                   │
│  • Raises custom exceptions (ConflictException, etc.)           │
│  • Returns APIResponse                                          │
│  • Imports other module Services for cross-module calls         │
├─────────────────────────────────────────────────────────────────┤
│  ▲                                                              │
│  │                                                              │
│  ▼                                                              │
│  REPOSITORY  (Data access)                                      │
│  • SQLAlchemy queries (select/insert/update/delete)             │
│  • Commits transactions                                         │
│  • Returns ORM model instances or scalars                       │
├─────────────────────────────────────────────────────────────────┤
│  ▲                                                              │
│  │                                                              │
│  ▼                                                              │
│  MODELS  (SQLAlchemy ORM)                                       │
│  • Table definitions, relationships, constraints                │
│  • No business logic                                            │
│  • Inherit from Base (declarative base)                         │
├─────────────────────────────────────────────────────────────────┤
│  ▲                                                              │
│  │                                                              │
│  ▼                                                              │
│  DATABASE  (PostgreSQL via asyncpg)                             │
└─────────────────────────────────────────────────────────────────┘

CORE / SHARED LAYER (cross-cutting):
  ┌──────────────┐    ┌────────────────┐    ┌──────────────────────┐
  │  config.py   │    │  exceptions.py │    │  shared/response.py │
  │  database.py │    │  logging.py    │    │  shared/dependency/ │
  │  mail.py     │    │  middleware.py  │    │  (get_current_user, │
  └──────────────┘    └────────────────┘    │   role_required)    │
                                            └──────────────────────┘
```

---

## Layer Responsibilities

### Router (`router.py`)

- Declare routes with `@router.get/post/patch/delete`.
- Accept `Depends()` injections (db session, current user, request, background tasks).
- Validate request body/query/params via Pydantic schemas from `schemas.py`.
- Call exactly **one** Service method per handler.
- Return the `APIResponse` object returned by the Service.
- **MUST NOT** contain business logic, conditional branching on user roles, or raw DB access.

### Service (`service.py`)

- Contain all business/domain logic.
- Call Repository functions for data access.
- Raise custom exceptions (`ConflictException`, `NotFoundException`, `UnauthorizedException`, `BadRequestException`).
- Return `APIResponse.success_response()` or `APIResponse.error_response()`.
- Import and call Services from other modules when cross-module orchestration is needed.
- **MUST NOT** import or use `request` or `response` FastAPI objects directly (exception: `background_tasks` for async jobs).
- **MUST NOT** access the database directly — use Repository only.

### Repository (`repository.py`)

- Contain raw SQLAlchemy operations (select, insert, update, delete).
- Accept `db: AsyncSession` as the first parameter.
- Commit transactions via `await db.commit()`.
- Return ORM model instances, scalars, or lists.
- **MUST NOT** contain business logic or raise domain exceptions.
- **MUST NOT** call other Repositories or Services.
- **SHOULD NOT** perform schema-level data transformation (leave that to Service or Schemas).

### Schemas (`schemas.py`)

- Pydantic v2 models for request validation and response serialization.
- Request schemas use `model_validator` / `field_validator` for compound validation rules.
- Response schemas are plain data containers, typically nested inside `APIResponse.data`.
- **MUST NOT** contain business logic or DB queries.

### Models (`models/*.py`)

- SQLAlchemy ORM model definitions.
- Define table columns, relationships (`back_populates`), constraints, and mixins (`TimestampMixin`, `AuditMixin`).
- Use UUID primary keys, `created_at`/`updated_at` timestamps, `is_active` soft-delete.
- **MUST NOT** contain business logic or helper methods beyond relationship convenience properties.

---

## Module Boundaries

Each module under `app/modules/<module_name>/` encapsulates a single business domain.

```
modules/
├── auth/            # Authentication, registration, password management, JWT
├── admin/           # Admin operations (stats, user management)
├── contact/         # Contact form submission
├── businesses/      # Business profile CRUD
├── profiling/       # Risk profiling questionnaire
├── risk_assessment/ # AHP risk scoring engine
├── chat/            # AI chat with RAG
├── policies/        # Policy management
├── recommendations/ # Insurance recommendations
└── reports/         # Report generation
```

### Module Boundary Rules

- A module's `repository.py` and internal helpers (e.g., `jwt_halper.py`, `cookie_helper.py`) are **private implementation details**.
- A module's `service.py` is the **public API** — this is the only file other modules may import.
- A module's `router.py` is consumed only by `app/api/v1/router.py` — no other module imports a router.
- No module may import another module's `repository.py` directly. Cross-module data access must go through the owning module's Service.
- No module may import another module's `models` directly with `from app.models import X`. Import from `app.models` (the shared models directory) instead.

---

## Communication Rules Between Modules

1. **Module A -> Module B**: Module A's Service imports Module B's Service.
   ```python
   # modules/a/service.py
   from app.modules.b.service import Service as BService
   
   class AService:
       async def do_something(self, db):
           result = await BService.do_work(db, ...)
   ```
2. **No shared state**: Services are stateless singletons; all state is passed through parameters (db session, user context).
3. **No circular dependencies**: If Module A imports Module B's Service, Module B must NOT import Module A's Service. Extract shared logic to `app/shared/` or a third module.
4. **No cross-module repository access**: Never `from app.modules.x.repository import ...` from outside module `x`.

---

## Shared Utilities Usage

### `app/shared/response.py` — APIResponse

Every endpoint must return via `APIResponse.success_response()` or `APIResponse.error_response()`. Never return raw dicts or ORM objects.

```python
return APIResponse.success_response(
    message="User registered",
    data={"id": str(user.id)}
)
```

### `app/shared/dependency/get_current_user.py` — get_current_user

Use in any router that requires authentication:

```python
from fastapi import Depends
from app.shared.dependency.get_current_user import get_current_user

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    ...
```

### `app/shared/dependency/role_required.py` — role_required

Use for admin-only or role-gated routes:

```python
from app.shared.dependency.role_required import role_required

@router.get("/admin/users")
async def list_users(current_user: User = Depends(role_required("ADMIN"))):
    ...
```

### `app/shared/base_model.py` — Base

All ORM models must inherit from `app.shared.base_model.Base` (not `sqlalchemy.orm.declarative_base` directly). This ensures consistent naming conventions and metadata.

### Core Infra Utilities (`app/core/`)

- `config.py` — All environment variables and secrets through `settings`.
- `database.py` — `get_db()` for session injection; `engine` and `AsyncSessionLocal` for direct use.
- `exceptions.py` — Use `ConflictException`, `NotFoundException`, `UnauthorizedException`, `BadRequestException` from here. Register new exceptions here.
- `logging.py` — Use `get_logger(__name__)` to obtain a standard logger.

---

## Error Handling Strategy

### Exception Hierarchy

- `BadRequestException` (400) — invalid input (non-validation errors).
- `UnauthorizedException` (401) — auth failures, invalid tokens, permission denied.
- `NotFoundException` (404) — resource not found.
- `ConflictException` (409) — duplicate resources, state conflicts.

### Flow

1. Service raises a custom exception at the point of failure.
2. Global exception handler in `core/exceptions.py` catches it, logs it, and returns a JSON response with the standard `APIResponse.error_response()` envelope.
3. Pydantic `RequestValidationError` is caught by the `validation_exception_handler` and returns a 422 with a semicolon-joined error message string.

### Rules

- Never catch and return a JSON response inline in a Router or Service — always raise an exception and let the global handler translate it.
- Never return `APIResponse.error_response()` directly in a Router handler — raise an exception instead.
- All error responses follow the shape `{"success": false, "error": "<message>", "message": null, "data": null}`.

---

## Dependency Injection Strategy

FastAPI's `Depends()` is the only DI mechanism.

| Dependency | Source | Usage |
|---|---|---|
| Database session | `core.database.get_db` | `db: AsyncSession = Depends(get_db)` |
| Current user | `shared.dependency.get_current_user.get_current_user` | `user: User = Depends(get_current_user)` |
| Role guard | `shared.dependency.role_required.role_required("ADMIN")` | `user: User = Depends(role_required("ADMIN"))` |
| Request/Response | FastAPI's built-in `Request`, `Response` | Only in Router layer |
| BackgroundTasks | FastAPI's `BackgroundTasks` | For async email, notifications |

Service classes are **singletons** (instantiated once at module level as `Service = AuthService()`) — they do not use `Depends`. Their parameters (db, request data, user) are passed explicitly as function arguments.

---

## Transaction Management Strategy

**Current pattern**: Repositories call `db.commit()` directly after each operation.

**Target pattern** (recommended for multi-repository operations):

1. Services control the transaction boundary.
2. Use an explicit `async with db.begin()` in the Service method when multiple Repository calls must be atomic.
3. Repository functions must NOT call `db.commit()` when called inside a `db.begin()` block — SQLAlchemy handles the commit on successful block exit.
4. Repository functions that perform single, standalone operations may call `db.commit()` directly.

```python
# Preferred in Service for multi-step operations:
async with db.begin():
    user = await Repository.create_user(db, ...)
    await Repository.store_token(db, user.id, token)
# db.begin() commits automatically on success, rolls back on exception
```

For single-repository operations, the repository calling `db.commit()` is acceptable.

---

## Testing Strategy

### Test Location

```
backend/tests/
├── conftest.py                    # Fixtures: test DB, client, auth headers
├── unit/                          # Service-layer tests (mock repositories)
│   ├── test_auth_service.py
│   └── test_profiling_branching.py
└── integration/                   # API-layer tests (real DB via TestClient)
    ├── test_auth_api.py
    ├── test_businesses_api.py
    └── test_profiling_api.py
```

### Testing Rules

- **Unit tests** mock the repository layer and test service logic in isolation. Use `pytest-mock` (`mocker` fixture).
- **Integration tests** use an actual test PostgreSQL database (via `TestClient` + `httpx.AsyncClient`). Use `conftest.py` to create/drop tables per session.
- **Test every custom exception path** — each `raise ConflictException(...)` in a Service method must have a corresponding test.
- **Test every repository function** with real DB queries.
- **API tests** must validate the `APIResponse` envelope shape, not just the HTTP status code.
- Frontend tests use `@testing-library/react` for component tests and cover Redux slices with plain Jest.

---

# Hard Architecture Rules

These rules are verified by automated checks and must never be violated.

### Layer Access Rules

| Rule | Description |
|---|---|
| `R -> S` | Router may call Service. |
| `S -> R` | Service may call Repository. |
| `R -> DB` | Repository may access Database (via ORM). |
| `R -X-> S` | Repository may NOT call Service. |
| `R -X-> R` | Repository may NOT call another module's Repository. |
| `S -X-> R` (cross-module) | Service may NOT call another module's Repository directly. |
| `Rtr -X-> DB` | Router may NOT access Database directly. |
| `Rtr -X-> R` | Router may NOT call Repository directly. |
| `Mod -X-> Mod(R)` | Module A may NOT import Module B's repository. |
| `Mod -> Mod(S)` | Module A may import Module B's Service only. |

### Business Logic Placement Rules

| Rule | Description |
|---|---|
| Business logic must live in Service. | Services own all domain rules, validations, and orchestrations. |
| Business logic MUST NOT exist in Router. | Routers are thin HTTP adapters. |
| Business logic MUST NOT exist in Repository. | Repositories are data access only. |
| Business logic MUST NOT exist in Models. | Models define schema and relationships only. |

### Response Format Rules

| Rule | Description |
|---|---|
| Every endpoint must return `APIResponse`. | Never return raw dict, ORM object, or plain JSON. |
| Success responses use `APIResponse.success_response()`. | Sets `success=True`. |
| Error responses use `APIResponse.error_response()`. | Sets `success=False`. |
| Errors must be raised as exceptions. | Never return `APIResponse.error_response()` inline in a handler. |

### Dependency Rules

| Rule | Description |
|---|---|
| DB session must be injected via `Depends(get_db)`. | No manual session creation in Routers/Services. |
| Auth guard must use `Depends(get_current_user)`. | No manual cookie/token parsing in route handlers. |
| Role guard must use `Depends(role_required(...))`. | No inline role checks in route handlers. |
| Service classes must be module-level singletons. | `Service = AuthService()` — one instance per module. |

### Module Boundary Rules

| Rule | Description |
|---|---|
| Module `repository.py` is private. | Only the owning module's Service may import it. |
| Module `router.py` is consumed only by `api/v1/router.py`. | No other module or file imports a module's router. |
| Module `service.py` is the public API. | Other modules may only import `service.py`. |
| Models are shared via `app.models`. | Import from `app.models` only, never from within a module. |

---

# Forbidden Patterns

The following anti-patterns have been detected or are likely to occur and are strictly forbidden.

### 1. Fat Router / Controller Logic

```python
# ❌ FORBIDDEN: Business logic in Router
@router.post("/login")
async def login(data: LoginRequest, db=Depends(get_db)):
    user = await db.execute(select(User).where(...))  # Direct DB access
    if not user:
        return JSONResponse(status_code=401, ...)  # Inline error response
    token = jwt.encode(...)  # Business logic
    return {"token": token}  # Non-standard response
```

### 2. Repository Import from Another Module

```python
# ❌ FORBIDDEN: Cross-module repository import
from app.modules.auth.repository import get_user_by_email  # In profiling/service.py
```

### 3. Circular Service Import

```python
# ❌ FORBIDDEN: Circular dependency
# modules/a/service.py
from app.modules.b.service import Service as BService

# modules/b/service.py
from app.modules.a.service import Service as AService  # CYCLE!
```

### 4. Business Logic in Repository

```python
# ❌ FORBIDDEN: Business logic in Repository
async def calculate_risk_score(db, user_id):
    score = await compute_complex_formula(db, user_id)  # Business logic
    return score
```

### 5. Inline Error Responses

```python
# ❌ FORBIDDEN: Returning error response directly
@router.get("/user/{id}")
async def get_user(id: str, db=Depends(get_db)):
    user = await get_user_by_id(db, id)
    if not user:
        return APIResponse.error_response(message="Not found")  # Don't do this
    return APIResponse.success_response(data=user)
    # ✅ Instead: raise NotFoundException("User not found")
```

### 6. ORM Model Acting as Business Object

```python
# ❌ FORBIDDEN: Business methods on ORM models
class User(Base):
    __tablename__ = "users"
    
    def is_eligible_for_policy(self):  # Business logic on model
        return self.risk_score < 0.5
```

### 7. Service Holding Request/Response State

```python
# ❌ FORBIDDEN: HTTP objects in Service
class AuthService:
    async def login(self, request: Request, response: Response, ...):
        # Service touches HTTP request/response objects
```

### 8. Nested Router Aggregation

```python
# ❌ FORBIDDEN: Module importing another module's router
# app/modules/admin/router.py
from app.modules.auth.router import router as auth_router  # Don't do this
```

### 9. Shared Mutability Between Services

```python
# ❌ FORBIDDEN: Mutable shared state
class ContactService:
    _rate_limit_store: dict = {}  # In-memory state — resets on restart, not scalable
```

### 10. Non-Standard Response Envelope

```python
# ❌ FORBIDDEN: Returning data without APIResponse wrapper
@router.get("/ping")
async def ping():
    return {"status": "ok"}  # Must use APIResponse.success_response()
```

---

# AI Agent Implementation Rules

This section contains strict instructions that every AI coding agent must follow when generating or modifying code in this repository.

## Rule 1: Follow the Module Template

Every new module under `app/modules/<name>/` must contain exactly these four files:

```
<name>/
├── __init__.py
├── router.py
├── service.py
├── repository.py
└── schemas.py
```

Do not add extra files unless the module has significant internal complexity (e.g., auth also has `jwt_halper.py`, `cookie_helper.py`, `password_hashing.py` — and those files are still private to the module).

## Rule 2: One Service Method Per Route Handler

Each route handler in `router.py` must call exactly one Service method. Do not call multiple Service methods sequentially in a single handler — if orchestration is needed, create a new Service method that handles it.

```python
# ✅ Correct
@router.post("/register")
async def register(data: RegisterRequest, db=Depends(get_db)):
    return await Service.register_user_service(data, db)

# ❌ Wrong
@router.post("/register")
async def register(data: RegisterRequest, db=Depends(get_db)):
    user = await Service.create_user(data, db)
    token = await Service.generate_token(user)  # Two service calls in one handler
    return APIResponse.success_response(data={"user": user, "token": token})
```

## Rule 3: Use Depends() For Everything in Routers

Never instantiate a session, fetch a user, or parse a cookie inside a route handler. Use `Depends()` for all injections:

```python
# ✅ Correct
@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return await Service.get_profile(current_user)

# ❌ Wrong
@router.get("/me")
async def get_me(request: Request, db=Depends(get_db)):
    token = request.cookies.get("access_token")  # Manual extraction
    user = await get_user_from_token(db, token)
    return await Service.get_profile(user)
```

## Rule 4: Exceptions Over Conditional Returns

Always raise an exception for error cases in Services. Do not return `APIResponse.error_response()` from Services — return it only from the top-level return path.

```python
# ✅ Correct
if not user:
    raise NotFoundException("User not found")

# ❌ Wrong
if not user:
    return APIResponse.error_response(message="User not found")
```

## Rule 5: Import Models from `app.models` Only

When importing ORM models, always use the shared `app.models` package:

```python
# ✅ Correct
from app.models import User, Role

# ❌ Wrong
from app.modules.auth.models import User  # No such thing
from app.models.users import User  # Importing from individual file
```

## Rule 6: Shared Dependencies Belong in `app/shared/dependency/`

When creating a reusable FastAPI dependency (e.g., a tenant resolver, feature flag checker), place it in `app/shared/dependency/`. Do not define it inside a module.

## Rule 7: No Business Logic in Alembic Migrations

Migrations may only contain schema changes and data migrations. They must not contain business rule evaluation. Use seed scripts (`seed.py`, `seed_wizard.py`) for data seeding.

## Rule 8: Service Must Be a Singleton

Every Service class must be instantiated once at module level as `Service = <ClassName>()`.

```python
class AuthService:
    ...

Service = AuthService()  # Singleton — always present
```

## Rule 9: Repository Must Be Stateless Functions

Repositories must use top-level async functions, not classes. Each function takes `db: AsyncSession` as the first positional argument.

```python
# ✅ Correct
async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    ...

# ❌ Wrong
class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_email(self, email: str):
        ...
```

## Rule 10: Commit in Repository, Control Transactions in Service

- Single-repository operations: Repository calls `await db.commit()`.
- Multi-repository atomic operations: Service wraps calls in `async with db.begin()` and Repositories skip `db.commit()`.
- Do not call `db.commit()` in a Router handler.

## Rule 11: Register New Routers in `app/api/v1/router.py`

When adding a new module, register its router in the API aggregator:

```python
# app/api/v1/router.py
from app.modules.new_module.router import router as new_module_router

API_router.include_router(new_module_router)
```

## Rule 12: Error Messages Must Be User-Facing Strings

Exception messages must be clean, polite, and end‑user readable. Do not include technical details, stack traces, or internal variable names in exception messages. Use the logger for debugging detail.

```python
# ✅ Correct
raise NotFoundException("Policy not found")

# ❌ Wrong
raise NotFoundException(f"Policy {policy_id} not found for user {user.trace_id}")
```

## Rule 13: Never Generate Placeholder Code

When implementing a new module, implement all four files fully. Do not leave empty route handlers, service methods, or repository functions. If a feature is out of scope, state it explicitly in a comment rather than leaving an empty function.

## Rule 14: Frontend Feature Modules Follow the Same Isolation Principle

Each frontend feature under `frontend/src/features/<name>/` must encapsulate its own:
- API calls (e.g., `authApi.ts`)
- Redux slice (e.g., `authSlice.ts`)
- TypeScript types (e.g., `auth.types.ts`)
- Components and forms
- Validation schemas (Zod)

No feature module may import another feature module's files directly. Shared UI primitives belong in `frontend/src/components/`. Shared hooks belong in `frontend/src/hooks/`.

## Rule 15: AIServiceAdapter Pattern for AI Module Access

The `app/ai/` directory does not contain FastAPI routes. It exposes an `AIServiceAdapter` (or equivalent) that modules import to use AI capabilities (RAG, LLM calls, embeddings). The adapter abstracts provider details so that swapping providers (Groq, Google GenAI, OpenAI) requires no changes in consuming modules.
