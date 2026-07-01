# InsureTech API Contracts

> Definitive contract for every backend endpoint. Frontend and backend must both conform to these contracts.

---

## Response Envelope

Every endpoint returns responses wrapped in the standard envelope:

```json
{
  "success": true | false,
  "error": "<error message or null>",
  "message": "<success message or null>",
  "data": { ... } | null
}
```

Constructed via `APIResponse.success_response(message, data)` and `APIResponse.error_response(message, data)` in `app/shared/response.py`.

---

## Error Schema (All Endpoints)

All error responses share this shape regardless of status code:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "message": null,
  "data": null
}
```

| Field | Type | Description |
|---|---|---|
| `success` | `false` | Always `false` for errors |
| `error` | `string` | Human-readable error message |
| `message` | `null` | Always `null` for errors |
| `data` | `null` | Always `null` for errors |

### Validation Error Shape (422)

```json
{
  "success": false,
  "error": "Field-level message; Another message",
  "message": null,
  "data": null
}
```

Multiple validation errors are semicolon-joined into a single string. Field-level messages are prefixed with the field name (e.g., `"email: Invalid email"`).

---

## Status Code Map

| Status | Description | Source |
|---|---|---|
| `200` | Success | Standard success response |
| `201` | Created | Used for `POST /auth/register` |
| `400` | Bad Request | `BadRequestException` |
| `401` | Unauthorized | `UnauthorizedException` |
| `404` | Not Found | `NotFoundException` |
| `409` | Conflict | `ConflictException` |
| `422` | Validation Error | Pydantic `RequestValidationError` |
| `429` | Too Many Requests | Contact form rate limit |
| `500` | Internal Server Error | Unhandled exceptions |

---

# Endpoints

---

## POST /api/v1/auth/register

Register a new user account.

### Request

```
POST /api/v1/auth/register
Content-Type: application/json
```

```json
{
  "full_name": "Alex Morgan",
  "email": "alex@company.com",
  "phone_no": "9876543210",
  "password": "StrongP@ss1",
  "confirm_password": "StrongP@ss1"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `full_name` | `string` | Yes | Non-empty |
| `email` | `string` (email) | Yes | Valid email format |
| `phone_no` | `string` | No | 10 digits, starts with 6-9 |
| `password` | `string` | Yes | Min 8 chars, 1 uppercase, 1 digit |
| `confirm_password` | `string` | Yes | Must match `password` |

### Response `201`

```json
{
  "success": true,
  "error": null,
  "message": "User registered successfully",
  "data": {
    "full_name": "Alex Morgan",
    "email": "alex@company.com",
    "phone": "9876543210"
  }
}
```

### Errors

| Status | Condition | `error` value |
|---|---|---|
| `409` | Email already exists | `"User with this email already exists"` |
| `422` | Validation failures | Field-level messages semicolon-joined |
| `500` | Unexpected error | `"An unexpected error occurred"` |

### Authentication

None required.

### Authorization

None.

---

## POST /api/v1/auth/login

Authenticate a user and establish a session via HttpOnly cookies.

### Request

```
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "alex@company.com",
  "password": "StrongP@ss1",
  "remember_me": false
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `email` | `string` (email) | Yes | — | User email |
| `password` | `string` | Yes | — | User password |
| `remember_me` | `boolean` | No | `false` | If `true`, cookies persist beyond session; if `false`, session cookies |

### Response `200`

```json
{
  "success": true,
  "error": null,
  "message": "User logged in successfully",
  "data": {
    "id": "uuid-string",
    "full_name": "Alex Morgan",
    "email": "alex@company.com",
    "role": "USER"
  }
}
```

Additionally, two HttpOnly cookies are set on the response:

| Cookie | Value | HttpOnly | Secure | SameSite |
|---|---|---|---|---|
| `access_token` | JWT string | Yes | `false` | `lax` |
| `refresh_token` | JWT string | Yes | `false` | `lax` |

### JWT Payload (access_token, refresh_token)

| Claim | Value |
|---|---|
| `sub` | User UUID |
| `email` | User email |
| `type` | `"access"` or `"refresh"` or `"password_reset"` |
| `exp` | Expiration timestamp |

Access token TTL: `ACCESS_TOKEN_EXPIRE_MINUTES` (env config, typically 15-30 min). Refresh token TTL: `REFRESH_TOKEN_EXPIRE_DAYS` (env config, typically 7-30 days).

### Errors

| Status | Condition | `error` value |
|---|---|---|
| `401` | Email does not exist | `"User with this email does not exist"` |
| `401` | Account is inactive | `"Account is inactive"` |
| `401` | Wrong password | `"Invalid email or password"` |
| `422` | Validation failures | Field-level messages |

### Authentication

None required.

### Authorization

None.

---

## POST /api/v1/auth/change-password

Change the authenticated user's password.

### Request

```
POST /api/v1/auth/change-password
Content-Type: application/json
Cookie: access_token=<jwt>
```

```json
{
  "current_password": "OldP@ss1",
  "new_password": "NewP@ss1"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `current_password` | `string` | Yes | — |
| `new_password` | `string` | Yes | Min 8 chars, 1 uppercase, 1 digit |

### Response `200`

```json
{
  "success": true,
  "error": null,
  "message": "Password changed successfully",
  "data": null
}
```

### Errors

| Status | Condition | `error` value |
|---|---|---|
| `401` | Current password is wrong | `"Current password is incorrect"` |
| `409` | New password same as current | `"New password cannot be same as current password"` |
| `422` | Validation failures | Field-level messages |

### Authentication

Required. Uses `Depends(get_current_user)` — reads `access_token` from cookie.

### Authorization

Any authenticated user.

---

## POST /api/v1/auth/forgot-password

Send a password reset email with a reset link.

### Request

```
POST /api/v1/auth/forgot-password
Content-Type: application/json
```

```json
{
  "email": "alex@company.com"
}
```

| Field | Type | Required |
|---|---|---|
| `email` | `string` (email) | Yes |

### Response `200`

```json
{
  "success": true,
  "error": null,
  "message": "Password reset email sent successfully",
  "data": null
}
```

### Behavior

1. Looks up user by email.
2. Invalidates any existing active password reset tokens.
3. Creates a new password reset JWT (type: `password_reset`, TTL: `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES`).
4. Sends email via background task with link: `<FRONTEND_URL>/reset-password?token=<jwt>`.
5. Stores hashed reset token in DB.

### Errors

| Status | Condition | `error` value |
|---|---|---|
| `401` | Email does not exist | `"User with this email does not exist"` |
| `422` | Validation failures | Field-level messages |

### Authentication

None required.

### Authorization

None.

---

## POST /api/v1/auth/reset-password

Reset the password using a token received via email.

### Request

```
POST /api/v1/auth/reset-password
Content-Type: application/json
```

```json
{
  "token": "<jwt-from-email-link>",
  "new_password": "NewStrongP@ss1",
  "confirm_password": "NewStrongP@ss1"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `token` | `string` | Yes | Valid JWT, type `password_reset` |
| `new_password` | `string` | Yes | Min 8 chars, 1 uppercase, 1 digit |
| `confirm_password` | `string` | Yes | Must match `new_password` |

### Response `200`

```json
{
  "success": true,
  "error": null,
  "message": "Password changed successfully",
  "data": null
}
```

### Errors

| Status | Condition | `error` value |
|---|---|---|
| `401` | Invalid/expired token | `"Invalid token"` |
| `401` | Wrong token type | `"Invalid token type"` |
| `401` | User from token not found | `"User not found"` |
| `401` | No active reset token in DB | `"Reset token not found"` |
| `401` | Token hash mismatch | `"Invalid token"` |
| `409` | Passwords don't match | `"Passwords do not match"` |
| `422` | Validation failures | Field-level messages |

### Authentication

None required (token itself is the credential).

### Authorization

None.

---

## POST /api/v1/auth/refresh

Refresh the access token using the refresh token cookie.

### Request

```
POST /api/v1/auth/refresh
Cookie: refresh_token=<jwt>
```

No request body.

### Response `200`

```json
{
  "success": true,
  "error": null,
  "message": "Token refreshed",
  "data": {
    "id": "uuid-string",
    "full_name": "Alex Morgan",
    "email": "alex@company.com",
    "role": "USER"
  }
}
```

Additionally, a new `access_token` cookie is set (and the existing `refresh_token` cookie is refreshed).

### Errors

| Status | Condition | `error` value |
|---|---|---|
| `401` | Missing/invalid refresh token | `"Invalid refresh token"` |
| `401` | Wrong token type | `"Invalid refresh token"` |
| `401` | User not found for token | `"User not found"` |
| `401` | Account is inactive | `"Account is inactive"` |

### Authentication

Via `refresh_token` cookie (read inside service, not via `Depends(get_current_user)`).

### Authorization

Any valid refresh token.

---

## GET /api/v1/auth/me

Get the currently authenticated user's profile.

### Request

```
GET /api/v1/auth/me
Cookie: access_token=<jwt>
```

No request body or query parameters.

### Response `200`

```json
{
  "success": true,
  "error": null,
  "message": "User fetched successfully",
  "data": {
    "id": "uuid-string",
    "full_name": "Alex Morgan",
    "email": "alex@company.com",
    "role": "USER"
  }
}
```

### Errors

| Status | Condition | `error` value |
|---|---|---|
| `401` | Missing access token cookie | `"Authentication required"` |
| `401` | Invalid/expired access token | `"Invalid access token"` |
| `401` | User not found | `"User not found"` |
| `401` | Account is inactive | `"Account is inactive"` |

### Authentication

Required via `Depends(get_current_user)` — reads `access_token` cookie.

### Authorization

Any authenticated user.

---

## POST /api/v1/auth/logout

Log the user out by clearing auth cookies.

### Request

```
POST /api/v1/auth/logout
```

No request body.

### Response `200`

```json
{
  "success": true,
  "error": null,
  "message": "Logged out successfully",
  "data": null
}
```

Additionally, `access_token` and `refresh_token` cookies are cleared (deleted) via `Response.delete_cookie()`.

### Errors

None (always succeeds).

### Authentication

None required.

### Authorization

None.

---

## GET /api/v1/admin/stats

Get dashboard statistics for the admin panel.

### Request

```
GET /api/v1/admin/stats
Cookie: access_token=<jwt>
```

No request body or query parameters.

### Response `200`

```json
{
  "success": true,
  "error": null,
  "message": "Dashboard stats fetched successfully",
  "data": {
    "total_users": 42,
    "active_users": 38,
    "inactive_users": 4
  }
}
```

| Field | Type | Description |
|---|---|---|
| `total_users` | `integer` | Total number of registered users |
| `active_users` | `integer` | Users with `is_active = true` |
| `inactive_users` | `integer` | Users with `is_active = false` |

### Errors

| Status | Condition | `error` value |
|---|---|---|
| `401` | Not authenticated | `"Authentication required"` |
| `401` | Not admin | `"Permission denied"` |

### Authentication

Required via `Depends(role_required("ADMIN"))`.

### Authorization

`ADMIN` role only.

---

## GET /api/v1/admin/users

Get a paginated list of all users with optional active filter.

### Request

```
GET /api/v1/admin/users?page=1&limit=10&is_active=true
Cookie: access_token=<jwt>
```

| Query Parameter | Type | Required | Default | Validation |
|---|---|---|---|---|
| `page` | `integer` | No | `1` | `>= 1` |
| `limit` | `integer` | No | `10` | `>= 1`, `<= 100` |
| `is_active` | `boolean` | No | `null` (all) | `true`, `false`, or absent |

### Response `200`

```json
{
  "success": true,
  "error": null,
  "message": "Users fetched successfully",
  "data": {
    "users": [
      {
        "id": "uuid-string",
        "email": "alex@company.com",
        "full_name": "Alex Morgan",
        "phone": "9876543210",
        "role": "USER",
        "is_active": true,
        "created_at": "2025-01-15T10:30:00",
        "updated_at": "2025-06-20T14:22:00"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 10
  }
}
```

| Field | Type | Description |
|---|---|---|
| `users` | `array` | List of user objects |
| `users[].id` | `string` (UUID) | User ID |
| `users[].email` | `string` | Email address |
| `users[].full_name` | `string` | Full name |
| `users[].phone` | `string` or `null` | Phone number |
| `users[].role` | `string` | `"USER"` or `"ADMIN"` |
| `users[].is_active` | `boolean` | Account active status |
| `users[].created_at` | `string` (ISO 8601) or `null` | Account creation timestamp |
| `users[].updated_at` | `string` (ISO 8601) or `null` | Last update timestamp |
| `total` | `integer` | Total user count (respecting filter) |
| `page` | `integer` | Current page |
| `limit` | `integer` | Items per page |

### Errors

| Status | Condition | `error` value |
|---|---|---|
| `401` | Not authenticated | `"Authentication required"` |
| `401` | Not admin | `"Permission denied"` |

### Authentication

Required via `Depends(role_required("ADMIN"))`.

### Authorization

`ADMIN` role only.

---

## PATCH /api/v1/admin/users/{user_id}/status

Activate or deactivate a user account.

### Request

```
PATCH /api/v1/admin/users/<uuid>/status
Content-Type: application/json
Cookie: access_token=<jwt>
```

| Path Parameter | Type | Description |
|---|---|---|
| `user_id` | `string` (UUID) | Target user ID |

```json
{
  "is_active": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `is_active` | `boolean` | Yes | `true` to activate, `false` to deactivate |

### Response `200`

```json
{
  "success": true,
  "error": null,
  "message": "User status updated successfully",
  "data": {
    "id": "uuid-string",
    "email": "alex@company.com",
    "full_name": "Alex Morgan",
    "phone": "9876543210",
    "role": "USER",
    "is_active": false,
    "created_at": "2025-01-15T10:30:00",
    "updated_at": "2025-06-20T14:22:00"
  }
}
```

Response `data` is the full updated user object (same shape as a list item).

### Errors

| Status | Condition | `error` value |
|---|---|---|
| `401` | Not authenticated | `"Authentication required"` |
| `401` | Not admin | `"Permission denied"` |
| `404` | User ID not found | `"User not found"` |
| `422` | Invalid UUID format | Validation error |

### Authentication

Required via `Depends(role_required("ADMIN"))`.

### Authorization

`ADMIN` role only.

---

## POST /api/v1/contact

Submit a contact form message. Rate-limited per IP (5 requests per 15 minutes).

### Request

```
POST /api/v1/contact
Content-Type: application/json
```

```json
{
  "name": "Alex Morgan",
  "email": "alex@company.com",
  "message": "I would like to know more about your insurance risk assessment platform."
}
```

| Field | Type | Required |
|---|---|---|
| `name` | `string` | Yes |
| `email` | `string` (email) | Yes |
| `message` | `string` | Yes |

### Response `200`

```json
{
  "detail": "Message sent successfully."
}
```

Note: This endpoint does NOT use the standard `APIResponse` envelope — it returns a raw `{"detail": "..."}` dict. This is a known inconsistency.

### Errors

| Status | Condition | `error` value |
|---|---|---|
| `429` | Rate limit exceeded (5 req / 15 min per IP) | `"Too many requests. Please try again in 15 minutes."` |
| `422` | Validation failures | Field-level messages |

### Authentication

None required.

### Authorization

None.

---

# Endpoint Summary Table

| Method | Path | Auth | Role | Rate Limited |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | No | — | No |
| `POST` | `/api/v1/auth/login` | No | — | No |
| `POST` | `/api/v1/auth/change-password` | Yes (cookie) | Any auth user | No |
| `POST` | `/api/v1/auth/forgot-password` | No | — | No |
| `POST` | `/api/v1/auth/reset-password` | Token in body | — | No |
| `POST` | `/api/v1/auth/refresh` | Cookie | Any valid refresh | No |
| `GET` | `/api/v1/auth/me` | Yes (cookie) | Any auth user | No |
| `POST` | `/api/v1/auth/logout` | No | — | No |
| `GET` | `/api/v1/admin/stats` | Yes (cookie) | ADMIN | No |
| `GET` | `/api/v1/admin/users` | Yes (cookie) | ADMIN | No |
| `PATCH` | `/api/v1/admin/users/{id}/status` | Yes (cookie) | ADMIN | No |
| `POST` | `/api/v1/contact` | No | — | Yes (5/15min per IP) |

---

# Frontend Integration Map

| Frontend Module | Backend Endpoint | Frontend File |
|---|---|---|
| `authApi.register()` | `POST /api/v1/auth/register` | `features/auth/authApi.ts:137` |
| `authApi.login()` | `POST /api/v1/auth/login` | `features/auth/authApi.ts:153` |
| `authApi.me()` | `GET /api/v1/auth/me` | `features/auth/authApi.ts:179` |
| `authApi.refreshToken()` | `POST /api/v1/auth/refresh` | `features/auth/authApi.ts:231` |
| `authApi.logout()` | `POST /api/v1/auth/logout` | `features/auth/authApi.ts:246` |
| `authApi.forgotPassword()` | `POST /api/v1/auth/forgot-password` | `features/auth/authApi.ts:201` |
| `authApi.resetPassword()` | `POST /api/v1/auth/reset-password` | `features/auth/authApi.ts:214` |
| `baseApi.get('/admin/stats')` | `GET /api/v1/admin/stats` | `pages/AdminDashboardPage.tsx:123` |
| `baseApi.get('/admin/users')` | `GET /api/v1/admin/users` | `pages/AdminUsersPage.tsx:44` |
| `baseApi.patch('/admin/users/{id}/status')` | `PATCH /api/v1/admin/users/{id}/status` | `pages/AdminUsersPage.tsx:60` |
| `baseApi.post('/contact')` | `POST /api/v1/contact` | `features/contact/contactApi.ts:9` |

### Frontend Data Transformation Notes

- `authApi.login()` maps the backend response's `data` object from snake_case (`full_name`, `phone_no`, `remember_me`) to camelCase (`fullName`, `phoneNo`, `rememberMe`) before returning.
- `authApi.me()` similarly maps `full_name`, `created_at`, `updated_at` to camelCase.
- `authApi.register()` transforms `fullName` → `full_name`, `phoneNo` → `phone_no`, `confirmPassword` → `confirm_password` in the request body.
- The `unwraData<T>()` helper extracts the `data` field from the `APIResponse` envelope when present.
- `change-password` endpoint is not yet consumed by the frontend.
- `GET /admin/stats` is consumed directly via `baseApi` (not through a feature API module), so its `data` unwrapping is done inline: `const data = body?.data ?? body`.

---

# API Versioning Rules

## Current Version: v1

All endpoints are prefixed with `/api/v1/`.

## Versioning Scheme

- The version is part of the URL path: `/api/v1/`, `/api/v2/`, etc.
- No header-based or query-parameter versioning.
- All routes for a version are registered in `app/api/v1/router.py`.

## Adding a New Version

1. Create `app/api/v2/` directory.
2. Copy the previous version's router file and adjust imports to point to v2 modules.
3. Register in `app/main.py`:
   ```python
   app.include_router(API_v2_router, prefix="/api/v2")
   ```
4. Old and new versions run side by side during migration.

## Versioning Rules

- Backward-compatible additions (new fields, new endpoints) do NOT require a new version.
- Breaking changes (renamed fields, removed fields, changed status codes, changed auth requirements) REQUIRE a new version.
- A deprecated version must remain operational for at least one release cycle after the replacement version ships.
- Document every version change in `docs/api/version-changelog.md`.

---

# Error Response Standards

## Envelope

```json
{
  "success": false,
  "error": "message",
  "message": null,
  "data": null
}
```

## Standard Error Codes

| Status | Exception Class | When |
|---|---|---|
| `400` | `BadRequestException` | Invalid request data outside schema validation |
| `401` | `UnauthorizedException` | Missing/invalid auth, wrong password, permission denied |
| `404` | `NotFoundException` | Resource not found by ID |
| `409` | `ConflictException` | Duplicate resource, state conflict |
| `422` | `RequestValidationError` | Pydantic validation failure |
| `429` | `HTTPException` (direct) | Rate limit exceeded (contact form) |
| `500` | Generic `Exception` | Unhandled server error |

## Error Message Conventions

- Messages are user-facing strings — no technical details, stack traces, or variable dumps.
- Messages start with a capital letter and end without a period (single-sentence convention).
- Validation errors with field context use the format: `"field_name: Error description"`
- Multiple validation errors are separated by `"; "`.

## Global Handler Registration

All exception handlers are registered in `register_exception_handlers(app)` inside `app/core/exceptions.py`. Every new custom exception must:

1. Be defined in `app/core/exceptions.py`.
2. Have a corresponding handler function.
3. Be registered in `register_exception_handlers()`.

---

# AI Agent API Rules

## Rule 1: Never Break Existing Contracts

- Existing endpoint paths must not change.
- Existing request field names, types, and validation rules must not change.
- Existing response field names and types must not change.
- Existing HTTP status codes must not change.
- Existing authentication and authorization requirements must not change.

If a change is needed, create a new version.

## Rule 2: Maintain the Response Envelope

Every new endpoint must return via `APIResponse.success_response()` or `APIResponse.error_response()`. The `contact` endpoint's non-standard `{"detail": "..."}` response is a known exception that must NOT be replicated.

```python
# ✅ Correct
return APIResponse.success_response(message="Done", data={...})
return APIResponse.error_response(message="Error occurred")

# ❌ Wrong
return {"detail": "Done"}
return JSONResponse(content={"custom": "shape"})
```

## Rule 3: Use Standard Exceptions

Do not catch exceptions and return inline JSON. Always raise standard exceptions and let global handlers translate them.

```python
# ✅ Correct
raise NotFoundException("User not found")
raise ConflictException("Email already exists")
raise UnauthorizedException("Invalid credentials")
raise BadRequestException("Invalid data")

# ❌ Wrong
return JSONResponse(status_code=404, content=APIResponse.error_response(message="Not found").model_dump())
```

## Rule 4: Register New Routes in the API v1 Router

Every new module's router must be included in `app/api/v1/router.py`:

```python
from app.modules.new_module.router import router as new_module_router
API_router.include_router(new_module_router)
```

## Rule 5: Prefix Routes by Module

Each module's router must define a `prefix`:

```python
router = APIRouter(prefix="/module-name", tags=["module-name"])
```

This ensures the full path becomes `/api/v1/module-name/...`.

## Rule 6: Tag All Endpoints

Every router must declare a `tags` list for OpenAPI grouping:

```python
router = APIRouter(prefix="/admin", tags=["admin"])
```

## Rule 7: Use Status Code Constants

Declare explicit `status_code` on every route decorator. Use `starlette.status` constants — never hardcode integers:

```python
from starlette import status
@router.post("/resource", status_code=status.HTTP_201_CREATED)
```

## Rule 8: Document Every Error Path

Every endpoint's service layer must raise custom exceptions for all error paths. No error should result in a generic 500.

Minimum error coverage per endpoint:
- Resource not found: `NotFoundException`
- Duplicate/conflict: `ConflictException`
- Auth failure: `UnauthorizedException`
- Invalid input (post-validation): `BadRequestException`

## Rule 9: Consistent Auth Patterns

- Use `Depends(get_current_user)` for user authentication.
- Use `Depends(role_required("ROLE_NAME"))` for role-based authorization.
- Do not parse cookies or tokens manually inside route handlers or services.

## Rule 10: Paginated List Endpoints Must Follow the Standard Shape

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

Use `page` as 1-indexed. Validate `page >= 1` and `limit` within a reasonable range (defaults: page=1, limit=10).

## Rule 11: Input Validation in Schema, Not in Service

All request validation (field formats, password strength, phone number format) must live in Pydantic schema `@field_validator` and `@model_validator` decorators. The service layer must assume validated input and only raise domain-logic exceptions.

## Rule 12: Error Messages Must Be Stable Strings

Do not interpolate user input into error messages. Error messages must be fixed strings that the frontend can match on for error handling.

```python
# ✅ Correct
raise NotFoundException("User not found")

# ❌ Wrong
raise NotFoundException(f"User {user_input_email} not found")
```

## Rule 13: Non-Standard Responses Must Be Audited

Any endpoint that returns a response not using `APIResponse` must be documented in this file as a known exception. New endpoints must always use the standard envelope.

Known exception: `POST /api/v1/contact` returns `{"detail": "Message sent successfully."}`. This must be migrated to `APIResponse` in a future version.

---

# Hard Rules

### Existing contracts must not be broken.

No endpoint path, request schema, response schema, or status code may be changed once shipped. Ship new versions for breaking changes.

### Existing response shapes must not change.

The `APIResponse` envelope (`success`, `error`, `message`, `data`) is immutable for existing endpoints. New fields may be added to `data`, but existing fields in `data` may not be removed or renamed.

### Existing status codes must remain consistent.

The HTTP status code for a given response must never change. If a `201` response becomes a `200`, that is a breaking change requiring a new API version.
