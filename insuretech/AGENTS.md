# AI Agent Operating Contract

> Consolidated rules extracted from `ARCHITECTURE_GUIDE.md`, `FRONTEND_ARCHITECTURE.md`, `API_CONTRACTS.md`, and `IMPLEMENTATION_SCOPE.md`. This is the entry point for all AI coding agents. All rules herein are mandatory.

---

## 1. Architecture & Layer Rules

### 1.1 Dependency Flow

```
Router  →  Service  →  Repository  →  Database (via ORM)
```

| Rule | Shorthand |
|---|---|
| Router may call Service | `R → S` |
| Service may call Repository | `S → R` |
| Repository may access Database (via ORM) | `R → DB` |
| Repository may NOT call Service | `R -X→ S` |
| Repository may NOT call another module's Repository | `R -X→ R` |
| Service may NOT call another module's Repository directly | `S -X→ R` (cross-module) |
| Router may NOT access Database directly | `Rtr -X→ DB` |
| Router may NOT call Repository directly | `Rtr -X→ R` |

### 1.2 Business Logic Placement

| Rule | Description |
|---|---|
| Business logic must live in Service | Services own all domain rules, validations, and orchestrations |
| Business logic MUST NOT exist in Router | Routers are thin HTTP adapters |
| Business logic MUST NOT exist in Repository | Repositories are data access only |
| Business logic MUST NOT exist in Models | Models define schema and relationships only |
| Business logic MUST NOT exist in Alembic migrations | Migrations are schema changes only. Use `seed.py`/`seed_wizard.py` for data seeding |

### 1.3 Response Format

- Every endpoint must return `APIResponse.success_response()` or `APIResponse.error_response()`.
- Never return raw dicts, ORM objects, or plain JSON.
- Error responses must be raised as exceptions, not returned inline.
- The known exception is `POST /api/v1/contact` which returns `{"detail": "..."}` — do not replicate this pattern.

### 1.4 Dependency Injection

- DB session: `db: AsyncSession = Depends(get_db)`
- Auth guard: `user: User = Depends(get_current_user)`
- Role guard: `user: User = Depends(role_required("ROLE"))`
- Service classes are module-level singletons: `Service = ClassName()`
- No manual session, cookie, or token parsing in route handlers or services

### 1.5 Transaction Management

- Single-repository operations: Repository calls `await db.commit()`.
- Multi-repository atomic operations: Service wraps calls in `async with db.begin()` and Repositories skip `db.commit()`.
- Do NOT call `db.commit()` in a Router handler.

### 1.6 Layer Contracts

| Layer | File | Responsibility |
|---|---|---|
| **Router** | `router.py` | HTTP mapping, Depends() injections, exactly one Service call per handler |
| **Service** | `service.py` | Business logic, exceptions, calls Repository, singleton pattern |
| **Repository** | `repository.py` | Async SQLAlchemy functions (not classes), `db` as first param |
| **Schemas** | `schemas.py` | Pydantic v2 models, `@field_validator` / `@model_validator` |
| **Models** | `models/*.py` | ORM definitions only — no business methods |

---

## 2. Module Boundary Rules

### 2.1 Backend Modules

Each module under `app/modules/<name>/` must contain:

```
<name>/
├── __init__.py
├── router.py
├── service.py
├── repository.py
└── schemas.py
```

Extra files (e.g., `jwt_halper.py`, `cookie_helper.py`) are allowed for significant internal complexity and remain private to the module.

### 2.2 Cross-Module Communication

| Allowed | Forbidden |
|---|---|
| Module A's Service imports Module B's Service | Module A imports Module B's Repository |
| Import models from `app.models` | Import models from within another module |
| Module router consumed by `api/v1/router.py` | Module imports another module's router |
| `service.py` is the public API | Any module file other than `service.py` is imported across modules |

### 2.3 No Circular Dependencies

If Module A imports Module B's Service, Module B must NOT import Module A's Service. Extract shared logic to `app/shared/` or a third module.

### 2.4 Router Registration

Every module's router must be registered in `app/api/v1/router.py`:

```python
from app.modules.<name>.router import router as <name>_router
API_router.include_router(<name>_router)
```

Each router must declare a `prefix` and `tags`:

```python
router = APIRouter(prefix="/<name>", tags=["<name>"])
```

---

## 3. Frontend Rules

### 3.1 Page Rule

Pages (`frontend/src/pages/`) are route-level only:
- Referenced by exactly one `<Route>` in `App.tsx`.
- Must NOT be imported by another page, feature component, or shared component.
- Handle data loading, auth checks, and redirect logic.

### 3.2 Component Reusability

Shared components (`frontend/src/components/`):
- Must NOT import from `features/`, `hooks/`, `store/`, or `pages/`.
- Must accept `className` for parent override.
- Must use CSS Modules for scoped styling.
- Must accept standard HTML attributes via props extension.
- One component per directory with `Component.tsx`, `Component.module.css`, `index.ts`.

### 3.3 API Logic Separation

- API logic must NOT exist inside presentation components.
- Components call hooks or dispatch thunks — never Axios directly.
- Data transformation (snake_case ↔ camelCase) happens in the API module, never in the component.
- Each feature has one API module (e.g., `authApi.ts`, `contactApi.ts`).

### 3.4 Type Centralization

- Each feature has one `*.types.ts` file containing all interfaces.
- Shared types (API envelope, pagination) belong in `frontend/src/types/`.
- Types must NOT be defined inline in components or hooks.
- Every Axios response must have a typed generic — never use `any`.

### 3.5 State Management Rules

- Global auth state only → Redux Toolkit (`authSlice`, `passwordSlice`).
- Server data (user lists, stats) → local `useState` with direct API calls.
- Form state → `react-hook-form`, never Redux.
- UI state (modals, toggles, carousels) → `useState` in nearest common parent.
- Thunks must use `rejectWithValue(getAuthErrorMessage(error))` in the catch block.
- Selectors must import `RootState` from `store/store.ts`.

### 3.6 Form Handling

- Every form uses `react-hook-form` with `zodResolver`.
- Zod schemas in `features/<name>/validation/<name>.schema.ts`.
- Validation messages in `*.constants.ts`, not inline in schemas.
- `<form noValidate>` to disable native browser validation.
- `disabled={loading}` on submit buttons during async operations.

### 3.7 Styling Conventions

| Component Type | Styling Approach |
|---|---|
| Shared components (`components/`) | CSS Modules only |
| Feature components (`features/*.tsx`) | CSS Modules only |
| Pages (`pages/`) | Tailwind or CSS Modules |

- Use CSS custom properties (`var(--...)`) from `styles/variable.css` for colors, radii, shadows.
- Do NOT mix Tailwind and CSS Modules in the same component.
- All interactive elements must have `focus-visible` outlines.

### 3.8 Loading States

| Loading Type | Display |
|---|---|
| Auth loading (Redux pending) | Full-page centered spinner |
| Data cards / tables | Skeleton placeholders |
| Form submission | Button text change (`disabled` + "Logging in...") |
| Initial session check | Full-screen spinner before routes |

- Never show a spinner for form submission loading — use button text change.
- Error banners on data fetches must include a retry button.

### 3.9 Route Guards

Use `<Outlet />` pattern — do NOT wrap individual route elements:

```typescript
// ✅ Correct
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<DashboardPage />} />
</Route>
```

---

## 4. API Contract Rules

### 4.1 Contract Immutability

- Existing endpoint paths must NOT change.
- Existing request field names, types, and validation rules must NOT change.
- Existing response field names and types must NOT change.
- Existing HTTP status codes must NOT change.
- Existing authentication and authorization requirements must NOT change.
- New fields may be added to `data` — existing fields may NOT be removed or renamed.
- Breaking changes require a new API version (`/api/v2/`).

### 4.2 New Endpoints

- Use `HTTP_STATUS_CODES.status` constants for status codes — never hardcode integers.
- Every error path must raise a custom exception (no generic 500 for expected errors).
- Minimum error coverage: `NotFoundException` (404), `ConflictException` (409), `UnauthorizedException` (401), `BadRequestException` (400).
- Input validation in Pydantic schemas, not in Service layer.

### 4.3 Paginated List Standard

Every paginated list endpoint must accept `page` and `limit` query parameters and return:

```json
{
  "data": {
    "items": [...],
    "total": <int>,
    "page": <int>,
    "limit": <int>
  }
}
```

1-indexed. Defaults: `page=1`, `limit=10`.

### 4.4 Error Message Standard

- Messages are user-facing strings — no technical details, stack traces, or variable dumps.
- Do NOT interpolate user input into error messages. Use fixed strings.
- Validation error format: `"field_name: Error description"` (multiple separated by `"; "`).

---

## 5. Error Handling Rules

### 5.1 Backend

| Exception | Status | When |
|---|---|---|
| `BadRequestException` | 400 | Invalid request data outside schema validation |
| `UnauthorizedException` | 401 | Missing/invalid auth, wrong password, permission denied |
| `NotFoundException` | 404 | Resource not found by ID |
| `ConflictException` | 409 | Duplicate resource, state conflict |
| `RequestValidationError` | 422 | Pydantic validation failure |
| Generic `Exception` | 500 | Unhandled server error |

- Never catch and return JSON inline — always raise exceptions.
- Every new custom exception must: (1) be defined in `app/core/exceptions.py`, (2) have a handler, (3) be registered in `register_exception_handlers()`.
- Error responses shape: `{"success": false, "error": "<message>", "message": null, "data": null}`.

### 5.2 Frontend

- Never use `alert()` for error display.
- Form errors displayed inline beneath each field via the `error` prop on `Input`.
- API errors displayed as inline messages above the submit button.
- All async thunks must catch errors and return `rejectWithValue`.

---

## 6. Coding Standards

### 6.1 Backend

- Services: module-level singleton (`Service = ClassName()`).
- Repositories: top-level async functions (not classes), `db: AsyncSession` as first argument.
- Routes: explicit `status_code` on every decorator, `prefix` and `tags` on every router.
- Models: inherit from `app.shared.base_model.Base`, use UUID PKs, `TimestampMixin`, `is_active` soft-delete.
- Imports: `from app.models import X` — never `from app.models.x import X`.
- Logging: `get_logger(__name__)` from `app.core.logging`.

### 6.2 Frontend

- Feature exports via barrel `index.ts` — types, API functions, slice actions, components.
- Shared components directory-scoped: `Name.tsx`, `Name.module.css`, `index.ts`.
- Every feature has its own API module — features do NOT share API modules.
- Pages must NOT import other pages.

---

## 7. Scope & Discipline Rules

### 7.1 Implementation Boundaries

| Rule | Description |
|---|---|
| Do NOT modify database schema unless explicitly instructed | Schema changes require Alembic migrations |
| Do NOT introduce new architectural patterns | Modular monolith, layered pattern, singleton services, flat repositories, APIResponse envelope, JWT cookies, Redux Toolkit, React Hook Form, CSS Modules |
| Do NOT add new dependencies | All dependencies are in `requirements.txt` and `package.json` |
| Do NOT refactor unrelated modules | When implementing Module A, do not touch Module B |
| Do NOT create features outside assigned scope | If assigned profiling, do not also implement risk_assessment |
| Do NOT implement deferred work unless requested | Tests, CI/CD, monitoring, caching, etc. are explicitly deferred |
| Do NOT modify or delete existing API contracts | Breaking changes require a new API version |
| Do NOT speculate | If a design decision is unclear, ask |

### 7.2 Deferred Work (NOT to be implemented unless explicitly requested)

| Item | Status |
|---|---|
| Unit tests | NOT STARTED |
| Integration tests | NOT STARTED |
| API tests | NOT STARTED |
| Frontend tests | NOT STARTED |
| CI/CD pipeline | NOT STARTED |
| End-to-end tests | NOT STARTED |
| Performance / load tests | NOT STARTED |
| Monitoring / APM | NOT STARTED |
| Distributed tracing | NOT STARTED |
| Caching layer (Redis) | NOT STARTED |
| Background job queue (Celery) | NOT STARTED |
| Refresh token rotation | NOT STARTED |
| General rate limiting middleware | NOT STARTED |
| Docker / containerization | NOT STARTED |

### 7.3 Out of Scope Technologies

Kubernetes, Microservices, Event Sourcing, Kafka, GraphQL, WebSockets, gRPC, CQRS, Service Mesh, OAuth/SSO, MongoDB (library declared but entirely unused).

---

## 8. Definition of Done

A module is complete only when ALL of the following criteria are met:

| Criterion | Evidence Required |
|---|---|
| **Schemas implemented** | `schemas.py` exists and is non-empty |
| **Repository implemented** | Async SQLAlchemy functions with `select()` / `execute()` / `commit()` |
| **Service implemented** | Business logic, custom exceptions, `APIResponse` returns, singleton pattern |
| **Router implemented** | All HTTP endpoints with correct method, path, status code, tags, `Depends()` |
| **Router registered** | Imported and included in `app/api/v1/router.py` |
| **Validation implemented** | `@field_validator` / `@model_validator` in schema classes |
| **Logging implemented** | `get_logger(__name__)` calls in service or repository |
| **Security satisfied** | `Depends(get_current_user)` or `Depends(role_required(...))` on protected routes |
| **Architecture compliant** | No cross-module repo imports, no business logic in routers/repositories/models |
| **No empty handlers** | Every function has a real implementation — no `pass` or placeholder stubs |

Tests, CI/CD, monitoring, documentation, and performance optimization are NOT required for module completion.

---

## 9. Source of Truth

When documentation conflicts, the following precedence applies:

| Priority | Document | Authority |
|---|---|---|
| 1 | **Database Migrations** (`alembic/versions/`) | Actual database schema — ground truth |
| 2 | **Database Models** (`app/models/`) | ORM representation of schema |
| 3 | **This Document** (`AGENTS.md`) | Consolidated agent operating rules |
| 4 | **Architecture Guide** (`ARCHITECTURE_GUIDE.md`) | Architectural rules and conventions |
| 5 | **API Contracts** (`API_CONTRACTS.md`) | Endpoint contracts and data shapes |
| 6 | **Frontend Architecture** (`FRONTEND_ARCHITECTURE.md`) | Frontend structure and conventions |
| 7 | **Implementation Scope** (`IMPLEMENTATION_SCOPE.md`) | Project boundaries and phase definitions |
| 8 | **Existing Code** (`.py`, `.ts`, `.tsx`) | Reference implementation |

---

## Appendix: Forbidden Patterns

The following anti-patterns are strictly forbidden. See `ARCHITECTURE_GUIDE.md` for full code examples.

1. **Fat Router** — DB access or business logic inside route handlers.
2. **Cross-module repository import** — `from app.modules.x.repository import ...` from outside module `x`.
3. **Circular service import** — Module A and Module B importing each other's Service.
4. **Business logic in Repository** — Domain calculations or rule evaluation in data access functions.
5. **Inline error responses** — Returning `APIResponse.error_response()` instead of raising an exception.
6. **Business methods on ORM models** — e.g., `User.is_eligible_for_policy()`.
7. **HTTP objects in Service** — `Request` or `Response` objects passed into Service methods.
8. **Nested router aggregation** — Module importing another module's `router.py`.
9. **Mutable shared state between services** — Module-level mutable dicts that persist across requests.
10. **Non-standard response envelope** — Returning data without `APIResponse` wrapper.
11. **Business logic in Router** — Conditional branching on user roles, direct DB access, token parsing.
12. **Mix of Tailwind and CSS Modules** in the same component.
13. **Inline type definitions** in components or hooks.
14. **API calls inside `useEffect`** without a thunk.
15. **Pages importing other pages**.
