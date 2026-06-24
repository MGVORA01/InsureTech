# InsureTech — Backend Coding Standards

> **Audience**: All developers and AI agents contributing Python code to the InsureTech backend.  
> **Compliance**: Mandatory. Deviations require explicit ADR justification.

---

## Table of Contents

1. [Naming Conventions](#1-naming-conventions)
2. [File Conventions](#2-file-conventions)
3. [Folder Conventions](#3-folder-conventions)
4. [Type Hint Requirements](#4-type-hint-requirements)
5. [Exception Handling Standards](#5-exception-handling-standards)
6. [Logging Standards](#6-logging-standards)
7. [Validation Standards](#7-validation-standards)
8. [Service Layer Standards](#8-service-layer-standards)
9. [Repository Layer Standards](#9-repository-layer-standards)
10. [API Standards](#10-api-standards)
11. [Testing Standards](#11-testing-standards)
12. [Mandatory Rules](#12-mandatory-rules)
13. [AI Agent Backend Checklist](#13-ai-agent-backend-checklist)

---

## 1. Naming Conventions

| Concept | Convention | Examples |
|---------|-----------|----------|
| Variables | `snake_case` | `access_token`, `user_id`, `existing_user` |
| Functions | `snake_case` | `get_user_by_email()`, `register_user_service()` |
| Classes (services) | `PascalCase` | `AuthService`, `ContactService` |
| Methods | `snake_case` | `change_password_service()`, `login_user_service()` |
| Modules / files | `snake_case.py` | `jwt_halper.py`, `cookie_helper.py` |
| Packages | `snake_case` | `modules/auth/`, `shared/dependency/` |
| Constants | `UPPER_SNAKE_CASE` | `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX` |
| Pydantic models | `PascalCase` | `RegisterRequest`, `LoginRequest` |
| SQLAlchemy models | `PascalCase` (singular) | `User`, `BusinessProfile`, `RiskCategory` |
| DB tables | `snake_case` (plural) | `users`, `business_profiles`, `risk_categories` |
| FK columns | `snake_case`, singular table name + `_id` | `user_id`, `role_id`, `risk_category_id` |
| Relationship attributes | `snake_case` | `business_profile`, `password_reset_tokens` |
| Enums | Not yet used | Prefer `StrEnum` or `IntEnum` when added |

**Anti-patterns to avoid**:
- Do not abbreviate (use `business_profile` not `biz_prof`, `authentication` not `authn`).
- Do not mix conventions in a single class or module.
- Do not use Hungarian notation.

---

## 2. File Conventions

Every feature module must contain exactly four files:

```
modules/<feature>/
├── router.py       # API route definitions only
├── service.py      # Business logic
├── schemas.py      # Pydantic request/response models
└── repository.py   # Database access layer
```

Additional optional files per module:

| File | Purpose | Example |
|------|---------|---------|
| `constants.py` | Module-scoped constants and enums | `auth/constants.py` |
| `tasks.py` | Background/async task definitions | `reports/tasks.py`, `risk_assessment/tasks.py` |
| `<utility>.py` | Module-specific helpers | `auth/jwt_halper.py`, `auth/password_hashing.py`, `auth/cookie_helper.py` |

**File-level rules**:
- Maximum line length: **88 characters** (align with `black` formatter).
- One class per file for domain models, unless classes are trivially small and closely related.
- Utility files must not import from `modules/` (see dependency direction rules below).
- `__init__.py` files may re-export symbols or remain empty.

---

## 3. Folder Conventions

```
backend/
├── app/
│   ├── main.py                    # FastAPI app factory
│   ├── seed.py                    # Role + admin user seeder
│   ├── api/
│   │   └── v1/
│   │       └── router.py          # Aggregates all module routers
│   ├── core/                      # Cross-cutting framework
│   │   ├── config.py              # Pydantic-settings
│   │   ├── database.py            # Async engine + session factory
│   │   ├── mongodb.py             # MongoDB stub
│   │   ├── exceptions.py          # Custom exceptions + global handlers
│   │   ├── logging.py             # Logging configuration
│   │   ├── middleware.py          # CORS and other middleware
│   │   └── mail.py                # Email dispatch (FastMail)
│   ├── models/                    # SQLAlchemy ORM models
│   │   ├── __init__.py            # Imports all models for Alembic
│   │   ├── audit_log.py           # AuditMixin + TimestampMixin
│   │   └── <entity>.py            # One file per entity
│   ├── modules/                   # Feature modules (domain slices)
│   │   ├── <feature>/             # router, service, schemas, repository
│   │   └── ...
│   ├── shared/                    # Reusable cross-module utilities
│   │   ├── base_model.py          # SQLAlchemy declarative base
│   │   ├── response.py            # APIResponse envelope
│   │   └── dependency/            # FastAPI dependencies
│   │       ├── get_current_user.py
│   │       └── role_required.py
│   └── ai/                        # AI pipeline (stubs)
├── alembic/                       # Database migrations
├── tests/                         # Test suite
│   ├── conftest.py
│   ├── unit/
│   └── integration/
└── requirements.txt
```

**Dependency direction** (strict):

```
router → service → repository → models
                   ↕
                 schemas
```

- `router` imports: `service`, `schemas`, `core.dependencies`, `core.database.get_db`
- `service` imports: `repository`, `schemas`, `core.exceptions`, `shared.response`
- `repository` imports: `models` only
- `models` imports: nothing from `modules/` or `shared/dependency/`
- `schemas` imports: `pydantic` only (no business logic)
- `core` may import: `models` and `config`
- `shared` may import: nothing from `modules/`

---

## 4. Type Hint Requirements

**All function signatures must have full type annotations** — parameters and return types.

### Acceptable forms

```python
# Annotated pattern (preferred for FastAPI dependencies)
from typing import Annotated
from fastapi import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

async def get_user(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
) -> User | None:
    ...

# Standard annotations
async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    ...

# Return type for services
async def register_user_service(
    data: RegisterRequest,
    db: AsyncSession,
) -> APIResponse[dict[str, Any]]:
    ...
```

### Rules

| Context | Required Type | Notes |
|---------|---------------|-------|
| Function parameters | Yes | All |
| Return types | Yes | All, including `-> None` for void functions |
| Class attributes (Pydantic) | Yes | Implicit via Pydantic |
| Class attributes (SQLAlchemy) | Yes | `Column(...)` wrapped |
| `Any` usage | Minimize | Prefer `dict[str, Any]` over bare `dict` |
| `Optional[X]` | Prefer `X \| None` | Both are accepted but `X \| None` preferred |
| `Union[X, Y]` | Prefer `X \| Y` | Both are accepted but `X \| Y` preferred |

### Type alias conventions

- Use `TypeVar` sparingly. The `DataT` in `APIResponse` is the canonical example.
- Do not create type aliases inside function bodies; define them at module level.

---

## 5. Exception Handling Standards

### Custom exception classes (defined in `app/core/exceptions.py`)

| Exception | HTTP Status | When to Raise |
|-----------|-------------|---------------|
| `BadRequestException` | 400 | Malformed input after Pydantic validation |
| `UnauthorizedException` | 401 | Missing/invalid auth, permission denied, inactive account |
| `NotFoundException` | 404 | Resource not found |
| `ConflictException` | 409 | Duplicate resource, conflicting state |

### Raise pattern

```python
# Correct — raise with a single message string
raise UnauthorizedException("Account is inactive")

# Correct — use ConflictException, not UnauthorizedException, for conflicts
raise ConflictException("User with this email already exists")

# Incorrect — do not raise fastapi.HTTPException directly
raise HTTPException(status_code=400, detail="...")  # ✗
```

### Rules

- **Never raise `HTTPException` or `StarletteHTTPException` directly**. Use custom exceptions only.
- **Never catch and re-raise as `HTTPException`** in service or repository layers. Let the global handler chain process exceptions.
- **Never leak database or stack details** in exception messages. User-facing messages must be sanitized.
- **Logging is automatic** — each global handler logs at the appropriate level (`warning` for 4xx, `exception` for 5xx).
- **404s from get-or-fail patterns**: return `NotFoundException("User not found")` rather than silently returning `None`.

---

## 6. Logging Standards

### Configuration

```python
# app/core/logging.py — already configured
import logging

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
```

### Usage

```python
from app.core.logging import get_logger

logger = get_logger(__name__)

class MyService:
    async def do_something(self) -> None:
        logger.info("Processing request for user %s", user_id)
        try:
            ...
        except Exception:
            logger.exception("Failed to process request for user %s", user_id)
            raise
```

### Log levels

| Level | When |
|-------|------|
| `info` | Normal operation milestones (user registered, password changed) |
| `warning` | Expected failures (invalid credentials, rate limiting, validation errors) |
| `error` | Unexpected failures that are handled gracefully |
| `exception` | Unhandled exceptions (always with `logger.exception()`) |
| `debug` | Development-only detail (SQL queries, full payloads) |

### Rules

- Always use **named loggers** (`get_logger(__name__)`), never the root logger.
- Use **printf-style formatting** in log messages (`logger.info("User %s logged in", user_id)`), not f-strings.
- Do not log PII (passwords, full email addresses, tokens, IP addresses without justification).
- The `structlog` dependency is declared but not yet configured. When enabled, follow its structured logging conventions.

---

## 7. Validation Standards

### Request validation via Pydantic

All request validation lives in `schemas.py` inside the feature module.

```python
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone_no: str | None = None
    password: str
    confirm_password: str

    @model_validator(mode="after")
    def check_password_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(char.isupper() for char in value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must contain at least one number")
        return value
```

### Rules

- **No duplicated validation logic across schemas**. Extract shared validators into a module-level `validation/` package or a shared base schema when the same rule (e.g., password strength) applies to multiple schemas.
- **Use `@field_validator("field_name")` for single-field rules** and `@model_validator(mode="after")` for cross-field rules.
- **Raise `ValueError`** inside validators (not custom exceptions) — Pydantic converts these automatically.
- **Do not add business logic to validators**. Validators check format and integrity only. Domain rules (e.g., "email must be unique") belong in the service layer.
- **Use `EmailStr` for email fields** — never `str` with a manual regex.
- **Use `Field()` for simple constraints** (min_length, max_length, ge, le, pattern) before writing custom validators.

---

## 8. Service Layer Standards

### Structure

Two patterns are accepted. Use **class-based** for modules with multiple related operations; use **standalone functions** for smaller modules.

#### Class-based (preferred for complex modules)

```python
class AuthService:
    async def register_user_service(
        self,
        data: RegisterRequest,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        ...

Service = AuthService()  # Singleton at module level
```

Usage in router: `await Service.register_user_service(data, db)`

#### Standalone functions (acceptable for simple modules)

```python
async def get_dashboard_stats_service(
    db: AsyncSession,
) -> APIResponse[dict[str, int]]:
    ...
```

### Rules

- **Zero business logic in routers**. The router's only job is to extract HTTP parameters and pass them to the service layer.
- **Zero database logic in routers**. No `db.execute()`, no `select()`, no `session.add()` in router files.
- **Zero direct SQL or raw queries in routers**.
- **Services return `APIResponse`** — never raw dicts, never ORM objects.
- **Services raise custom exceptions** for error paths — never return error tuples or `(data, error)` patterns.
- **Services orchestrate repository calls and external dependencies** — but do not call repositories from other modules' repository files. Cross-module data access must go through the owning module's service layer.

---

## 9. Repository Layer Standards

### Structure

Repository functions are **standalone async functions** in `repository.py`:

```python
async def get_user_by_email(
    db: AsyncSession,
    email: str,
) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.role))
        .where(User.email == email)
    )
    return result.scalar_one_or_none()
```

### Rules

- **`db: AsyncSession` is always the first parameter**.
- **Return ORM model instances** or `None`. Do not return dicts unless aggregating non-model results (e.g., count queries).
- **Use `selectinload()` for eager loading** of relationships that the service layer will access. Do not lazy-load.
- **Use `scalar_one_or_none()` for single-row lookups**, `scalars().all()` for multi-row.
- **Use `db.add() + await db.commit() + await db.refresh()`** for creates.
- **Use attribute assignment + `db.add()` + `await db.commit()`** for updates.
- **Repository methods never raise exceptions**. Return `None` for not-found cases; let the service layer decide if that is an error.
- **Repository methods never call other modules' repositories**. If cross-module data is needed, access it through the owning module's service layer.

### Transaction management

```python
# Reads — no explicit commit needed
async def get_user(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

# Writes — explicit commit + refresh
async def create_user(db: AsyncSession, ...) -> User:
    user = User(...)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
```

---

## 10. API Standards

### Router structure

```python
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.modules.myfeature.schemas import MyRequest
from app.modules.myfeature.service import Service
from app.shared.dependency.get_current_user import get_current_user

router = APIRouter(
    prefix="/myfeature",
    tags=["myfeature"],
)

@router.post("/endpoint", status_code=status.HTTP_201_CREATED)
async def my_handler(
    data: MyRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> APIResponse:
    return await Service.do_something(data, db, current_user)
```

### Response envelope

Every endpoint returns the `APIResponse` format (defined in `app/shared/response.py`):

```json
{
  "success": true,
  "error": null,
  "message": "User registered successfully",
  "data": { ... }
}
```

Success responses are built with:
```python
return APIResponse.success_response(message="...", data={...})
```

Error responses are built by the global exception handlers — do not construct them manually.

### HTTP status code conventions

| Method | Success Code | Notes |
|--------|-------------|-------|
| `POST` (create) | `201 CREATED` | Resource creation |
| `POST` (action) | `200 OK` | Login, password reset, non-creating actions |
| `GET` | `200 OK` | Read operations |
| `PATCH` | `200 OK` | Partial updates |
| `DELETE` | `204 NO CONTENT` | Deletion (not yet implemented) |

### Endpoint naming

- Use **kebab-case** for URL paths: `/forgot-password`, `/change-password`, `/user-status`.
- Use **plural nouns** for collection resources: `/users`, `/policies`.
- Use **singular nouns** for actions: `/login`, `/refresh`, `/logout`.

### Dependency injection patterns

Prefer `Annotated[T, Depends(...)]` over `T = Depends(...)`:

```python
# Preferred
db: Annotated[AsyncSession, Depends(get_db)]

# Also acceptable (existing code)
db: AsyncSession = Depends(get_db)
```

---

## 11. Testing Standards

### Test framework

- **pytest** with `pytest-asyncio` for async tests.
- **httpx** (`AsyncClient`) for HTTP integration tests.
- **pytest-mock** for mocking.

### Test file structure

```
tests/
├── conftest.py                    # Fixtures (db session, test client, test user)
├── unit/
│   ├── test_auth_service.py
│   ├── test_profiling_branching.py
│   └── test_ahp_engine.py
└── integration/
    ├── test_auth_api.py
    ├── test_businesses_api.py
    └── test_profiling_api.py
```

### Naming

- Test files: `test_<module>.py`
- Test functions: `test_<scenario>_<expected_behavior>`
- Test classes: `Test<Feature>`

### What to test

| Layer | Focus | Tools |
|-------|-------|-------|
| **Unit (service)** | Business logic, exception paths, edge cases | Mock repository layer |
| **Unit (repository)** | Query construction (happy path only) | In-memory SQLite or test DB |
| **Unit (schemas)** | Validation rules (Pydantic validators) | Direct model instantiation |
| **Integration** | Full request-response cycle, auth, status codes | `httpx.AsyncClient` against test FastAPI app |

### Fixtures (conftest.py)

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.fixture
async def db_session() -> AsyncSession:
    ...

@pytest.fixture
async def test_client(db_session) -> AsyncClient:
    ...

@pytest.fixture
async def test_user(db_session) -> User:
    ...
```

### Rules

- **Tests must be hermetic** — no dependency on external services (SMTP, LLM, Cloudinary). Mock all external calls.
- **Tests must clean up after themselves** — use transaction rollback or fixture teardown.
- **Do not test the ORM or database engine** — test your query logic, not SQLAlchemy itself.
- **Write tests before or alongside implementation** for all new service and repository code.

---

## 12. Mandatory Rules

These rules are enforced during code review and by automated linting:

### PEP8 Compliance
- Line length: 88 characters (black default).
- 4-space indentation (no tabs).
- Two blank lines between top-level definitions, one between methods.
- Imports grouped: standard library → third-party → local, with a blank line between groups.

### Google Style Docstrings

```python
def hash(input: str) -> str:
    """Hash a plain-text input.

    Args:
        input: Plain-text input to hash.

    Returns:
        The hashed input string.
    """
    return pwd_context.hash(input)
```

Every public function, method, and class must have a Google-style docstring. One-line docstrings are acceptable for trivial getters/setters.

### Full Type Annotations
- Every function parameter and return type must be annotated.
- Every class attribute must be typed.
- See [Section 4](#4-type-hint-requirements).

### No Business Logic in Routers
- Routers must only: parse HTTP parameters, call service layer, return result.
- No conditionals, no loops, no data transformation, no validation beyond Pydantic model parsing.

### No Database Logic in Routers
- Routers must not import or use `db.execute()`, `select()`, `session.add()`, or any SQLAlchemy constructs.

### No Direct SQL Inside Routers
- Raw SQL strings, `text()`, or SQLAlchemy `select()` must never appear in router files.

### No Duplicated Validation Logic
- Shared Pydantic validators (e.g., `validate_password`) must be extracted into a reusable function or base class. Duplicate `@field_validator` blocks across schemas are prohibited.

---

## 13. AI Agent Backend Checklist

This checklist must be reviewed **before every backend code generation task**.

### Pre-Generation

- [ ] I have read `PROJECT_OVERVIEW.md` to understand module state (implemented vs placeholder).
- [ ] I have read `DATABASE_SCHEMA.md` to understand existing entities and relationships.
- [ ] I have verified the target module is not already implemented (check `backend/app/modules/<name>/`).
- [ ] I have confirmed no duplicate entity exists in `backend/app/models/`.
- [ ] I have confirmed no duplicate endpoint exists in `backend/app/api/v1/router.py`.

### Architecture & Structure

- [ ] I am following the **router → service → repository → models** dependency direction.
- [ ] I am creating exactly four files per module: `router.py`, `service.py`, `schemas.py`, `repository.py`.
- [ ] I am placing shared logic in `app/shared/` (not duplicating across modules).
- [ ] I am placing cross-cutting concerns in `app/core/` (not in modules).
- [ ] I am not creating new tables — only working with existing models (unless explicitly instructed).

### Coding Standards

- [ ] All function signatures have full type annotations (parameters + return type).
- [ ] All functions have Google-style docstrings.
- [ ] No business logic exists in router files.
- [ ] No database logic exists in router files.
- [ ] No `select()`, `text()`, or raw SQL exists in router files.
- [ ] No duplicated validation logic across schemas.
- [ ] All exceptions raised are custom exceptions from `app/core/exceptions.py` (not `HTTPException`).
- [ ] All service methods return `APIResponse.success_response()` or raise custom exceptions.
- [ ] Repository methods return ORM models or `None` (not dicts, not response envelopes).

### Imports

- [ ] Imports follow the standard → third-party → local grouping.
- [ ] Cross-module repository calls do not exist (access through the owning module's service).
- [ ] `app/core/database.get_db` is the only DB session source.
- [ ] Dependency injection uses `Annotated[Type, Depends(...)]` where possible.

### Data Integrity

- [ ] All UUID PKs use `server_default=text("gen_random_uuid()")`.
- [ ] Soft-delete tables use `is_active` boolean with `server_default=text("true")`.
- [ ] New entities inherit `TimestampMixin` (and `AuditMixin` if user-audit is required).
- [ ] No physical `DELETE` is used — only `UPDATE is_active = false`.

### Testing Awareness

- [ ] I have written / will write unit tests for all service error paths.
- [ ] I have written / will write integration tests for all new endpoints.
- [ ] Tests mock external services (SMTP, LLM, Cloudinary).
