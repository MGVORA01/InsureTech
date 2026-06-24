# InsureTech — Frontend Coding Standards

> **Audience**: All developers and AI agents contributing TypeScript/React code to the InsureTech frontend.  
> **Compliance**: Mandatory. Deviations require explicit justification in code review.

---

## Table of Contents

1. [TypeScript Standards](#1-typescript-standards)
2. [Naming Conventions](#2-naming-conventions)
3. [Component Standards](#3-component-standards)
4. [Hook Standards](#4-hook-standards)
5. [Service / API Layer Standards](#5-service--api-layer-standards)
6. [Styling Standards](#6-styling-standards)
7. [State Management Standards](#7-state-management-standards)
8. [Form & Validation Standards](#8-form--validation-standards)
9. [Routing Standards](#9-routing-standards)
10. [Constants & Configuration Standards](#10-constants--configuration-standards)
11. [Testing Standards](#11-testing-standards)
12. [Mandatory Rules](#12-mandatory-rules)
13. [AI Agent Frontend Checklist](#13-ai-agent-frontend-checklist)

---

## 1. TypeScript Standards

### Configuration

The project uses two TypeScript configs (project references pattern):

- `tsconfig.app.json` — application source (`src/`)
- `tsconfig.node.json` — build tooling (`vite.config.ts`)

Key compiler options:

| Option | Value | Effect |
|--------|-------|--------|
| `target` | `es2023` | Modern JS output |
| `module` | `esnext` | ESM module output |
| `moduleResolution` | `bundler` | Vite/resolve-compatible resolution |
| `jsx` | `react-jsx` | Automatic JSX runtime |
| `noUnusedLocals` | `true` | Error on unused variables |
| `noUnusedParameters` | `true` | Error on unused parameters |
| `noFallthroughCasesInSwitch` | `true` | No implicit fallthrough |
| `verbatimModuleSyntax` | `true` | Requires `import type` for type-only imports |
| `erasableSyntaxOnly` | `true` | No runtime-enum-like constructs |

### Strict typing rules

- **No `any` type anywhere.** Use `unknown` and narrow with type guards when the type is genuinely uncertain.
- **Interfaces preferred over `type` aliases** for object shapes. Use `type` only for unions, intersections, utility types, and primitives.

```typescript
// Preferred — interface for objects
interface User {
  id: string
  fullName: string
  email: string
}

// Acceptable — type for unions
type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'failed'
type Nullable<T> = T | null
```

- **Generic types** are required for wrappers (`ApiEnvelope<T>`, `APIResponse<T>`, `AsyncThunkAction<T>`).
- **`as const`** for constants to preserve literal types.
- **`satisfies` operator** preferred over type assertion (`as`) where applicable.
- **`import type`** required for type-only imports (enforced by `verbatimModuleSyntax`).

```typescript
// Correct
import type { User } from './auth.types'
import { useAuth } from './useAuth'

// Incorrect
import { User } from './auth.types'  // ✗ runtime error with verbatimModuleSyntax
```

---

## 2. Naming Conventions

| Concept | Convention | Examples |
|---------|-----------|----------|
| Variables | `camelCase` | `accessToken`, `pageState`, `rememberMe` |
| Functions | `camelCase` | `handleSubmit`, `loadCurrentUser`, `getAuthErrorMessage` |
| React components | `PascalCase` | `LoginForm`, `PasswordInput`, `ProtectedRoute` |
| Props interfaces | `PascalCase` with `Props` suffix | `ButtonProps`, `InputProps`, `CheckboxProps` |
| Hooks | `camelCase` with `use` prefix | `useAuth`, `useSessionCheck` |
| Custom event handlers | `handle` + `Noun` + `Verb` | `handleSubmit`, `handleClose` |
| Booleans | Prefix with `is`, `has`, `should` | `isActive`, `isAuthenticated`, `hasError` |
| Constants | `UPPER_SNAKE_CASE` | `AUTH_ENDPOINTS`, `AUTH_MESSAGES`, `RATE_LIMIT_WINDOW` |
| Files (components) | `PascalCase.tsx` | `LoginForm.tsx`, `Button.tsx` |
| Files (hooks) | `camelCase.ts` | `useAuth.ts`, `useSessionCheck.ts` |
| Files (services) | `camelCase.ts` | `authApi.ts`, `contactApi.ts` |
| Files (utilities) | `camelCase.ts` | `refreshTimer.ts` |
| CSS Module files | `Component.module.css` | `Button.module.css`, `Input.module.css` |
| CSS custom properties | `--kebab-case` | `--color-primary`, `--radius-md` |
| Tailwind utility classes | Lowercase, dash-separated | `bg-slate-50`, `max-w-md`, `border-t-transparent` |
| Redux slice files | `camelCase.ts` | `authSlice.ts`, `passwordSlice.ts` |
| Redux action types | `'domain/actionName'` | `'auth/registerUser'`, `'auth/loginUser'` |

**Anti-patterns to avoid**:
- Do not prefix interfaces with `I` (e.g., `IUser` → `User`).
- Do not use Hungarian notation.
- Do not use trailing underscores for private members (use `#` private fields or module-level closures).

---

## 3. Component Standards

### Structure

Every component follows this structure:

```typescript
// Imports
import { type ReactNode, type ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

// Props interface
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  fullWidth?: boolean
  variant?: 'primary' | 'secondary'
}

// Component definition
function Button({
  children,
  className = '',
  fullWidth = false,
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[styles.button, styles[variant], fullWidth ? styles.fullWidth : '', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
```

### Rules

- **Functional components only.** No class components.
- **No `React.FC` or `React.FunctionComponent`.** Use explicit `interface Props` + plain function signature.
- **`export default`** for all components. Barrel `index.ts` re-exports: `export { default } from './Button'`.
- **Props use `interface`** (not `type`). Extend native HTML attributes when wrapping native elements:

```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  rightElement?: ReactNode
}
```

- **Default prop values** via destructuring defaults, not `defaultProps`.
- **`forwardRef`** with a named inner function when ref forwarding is needed:

```typescript
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, rightElement, ...props },
  ref,
) {
  ...
})
```

- **`displayName`** is not explicitly set (rely on function name inference).
- **Destructure all props** at the function signature.
- **Spread `...props` last** after explicit props to allow override safety.

### Conditional rendering pattern

```typescript
{isLoading && <Spinner />}           // Correct
{isLoading ? <Spinner /> : null}     // Acceptable
{isLoading && (                          // ✗ do not embed JSX in complex ternaries
  condition ? <A /> : <B />
)}
```

### Accessibility

- Use `aria-describedby`, `aria-invalid`, `role="alert"` for error states.
- Use `htmlFor` / `id` pairing for label-input association.
- Use `aria-controls`, `aria-label`, `aria-pressed` for toggle controls.
- Use `:focus-visible` for keyboard focus indicators (not `:focus`).

---

## 4. Hook Standards

### Structure

```typescript
import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../store/store'
import { loginUser, logoutUser, selectAuth } from '../features/auth/authSlice'

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>()
  const auth = useSelector(selectAuth)

  const login = useCallback(
    async (data: LoginFormData) => {
      return dispatch(loginUser(data)).unwrap()
    },
    [dispatch],
  )

  const logout = useCallback(async () => {
    return dispatch(logoutUser()).unwrap()
  }, [dispatch])

  return {
    ...auth,
    login,
    logout,
    ...
  }
}
```

### Rules

- **Custom hooks are named `use<Feature>` and exported as named functions** (not default).
- **Wrap all dispatched thunks in `useCallback`** with `[dispatch]` dependency.
- **Return a single object** combining state and action creators. Prefer spreading Redux state into the return value.
- **Do not return JSX from a hook.** Hooks return data and callbacks only.
- **Do not call hooks conditionally** (follow Rules of Hooks).
- **Use typed dispatch**: `useDispatch<AppDispatch>()`.
- **Use `useSelector` with memoized selectors** (defined in the slice file).
- **Use `unwrap()` on thunk dispatches** to handle success/failure via promises rather than tracking Redux state manually.

---

## 5. Service / API Layer Standards

### Axios instance pattern

```typescript
// api/baseApi.ts
import axios from 'axios'

export const BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1`

const baseApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

export default baseApi
```

### Feature-specific API module pattern

```typescript
// features/auth/authApi.ts
import axios from 'axios'
import { BASE_URL } from '../../api/baseApi'
import type { User, ApiEnvelope } from './auth.types'

// Module-level closure for in-memory token
let accessToken: string | null = null

const authHttp = axios.create({ baseURL: BASE_URL })

// Request interceptor — attach Bearer token
authHttp.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Response interceptor — automatic 401 retry
authHttp.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry && !isAuthEndpoint) {
      error.config._retry = true
      await authApi.refreshToken()
      return authHttp(error.config)
    }
    return Promise.reject(error)
  },
)

// Helper: extract data from API envelope
function unwrapData<T>(response: { data: ApiEnvelope<T> | T }): T {
  if ((response.data as ApiEnvelope<T>).data !== undefined) {
    return (response.data as ApiEnvelope<T>).data as T
  }
  return response.data as T
}

export const authApi = {
  async login(payload: LoginPayload): Promise<User> {
    const response = await authHttp.post<ApiEnvelope<User>>('/auth/login', {
      email: payload.email,
      password: payload.password,
    })
    accessToken = extractTokenFromResponse(response)
    return unwrapData(response)
  },
  ...
}
```

### Rules

- **`baseApi` is the shared Axios instance** for endpoints that don't need auth interceptors.
- **Feature-specific Axios instances** for features with custom interceptors (e.g., `authHttp` for automatic token refresh).
- **Module-level closure** for in-memory state (access token) — not stored in Redux.
- **Session markers** in `localStorage` (remember-me) or `sessionStorage` (session-only) using a consistent key: `ins_auth_session`.
- **Response unwrapping**: Always unwrap the `data` field from the `ApiEnvelope<T>` backend response.
- **Error message extraction**: Check `error.response.data.error` first (backend convention), then `error.response.data.message`, then fall back to a generic message.
- **CamelCase ↔ snake_case mapping** happens exclusively in the API layer — never in components or hooks.
- **Hard-coded endpoint strings** — kept in a `constants` file, not inline in the API module.

---

## 6. Styling Standards

### Design system foundation

The project uses **CSS custom properties** (in `src/styles/variable.css`) as the single source of truth for all design tokens. Tailwind CSS maps to these variables in `tailwind.config.js`.

**There is no Bootstrap.** The styling stack is:

| Layer | Role |
|-------|------|
| `variable.css` | Design tokens (colors, radii, shadows, spacing) |
| `overlay-tokens.css` | Overlay-specific color tokens |
| Tailwind CSS | Utility-first classes for layout and pages |
| CSS Modules | Scoped component styles for reusable components |
| Inline `style={{}}` | Dynamic CSS variable references when needed |

### When to use each approach

| Context | Approach | Example |
|---------|----------|---------|
| Reusable primitives (Button, Input, Checkbox) | CSS Modules | `Button.module.css` |
| Layout components (AuthLayout) | CSS Modules | `AuthLayout.module.css` |
| Page-level layout | Tailwind utilities | `className="flex min-h-screen items-center justify-center bg-slate-50"` |
| Marketing / landing pages | Tailwind utilities | `HomePage.tsx` (100% Tailwind) |
| Dynamic values from JS | Inline `style` | `style={{ '--color': value }}` |

### CSS Module conventions

```css
/* Button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  border-radius: var(--radius-md);
  transition: all 160ms ease;
}

.primary {
  background-color: var(--color-primary);
  color: white;
}

.secondary {
  background-color: transparent;
  border: 1px solid var(--color-primary);
}

.fullWidth {
  width: 100%;
}
```

- Use `var(--variable-name)` to reference design tokens.
- Use `160ms ease` for transitions (consistent timing).
- Use `:focus-visible` for keyboard focus indicators.
- Responsive breakpoints at `520px` and `860px`.

### Tailwind conventions

- Use Tailwind classes for layout, spacing, typography, and responsive behavior.
- Custom color names (`primary`, `secondary`, `cta`, `risk-*`, `surface`, `background`) are preferred over raw color values.
- Use inline `style={{}}` only when setting dynamic CSS variable values.
- Custom animations: `animate-fadeIn` (defined in Tailwind config).

### CSS class composition pattern

```typescript
// Component-side class composition (consistent across all components)
className={[styles.button, styles[variant], fullWidth ? styles.fullWidth : '', className]
  .filter(Boolean)
  .join(' ')}
```

---

## 7. State Management Standards

### Redux usage

| Concern | Tool | Example |
|---------|------|---------|
| Auth state | Redux Toolkit slice | `authSlice.ts` |
| Password flows | Redux Toolkit slice | `passwordSlice.ts` |
| Server data (future) | TanStack React Query | `@tanstack/react-query` (declared, not yet used) |
| UI state (landing page) | Local `useState` | `HomePage.tsx` |

### Slice structure

```typescript
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  status: AuthStatus
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  status: 'idle',
}

// Async thunks
export const loginUser = createAsyncThunk<User, LoginFormData, { rejectValue: string }>(
  'auth/loginUser',
  async (data, { rejectWithValue }) => {
    try {
      return await authApi.login(data)
    } catch (err) {
      return rejectWithValue(getAuthErrorMessage(err))
    }
  },
)

// Selectors
export const selectAuth = (state: RootState) => state.auth
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated
```

### Rules

- **Redux for global shared state only** (auth, user session). Page-local state uses `useState`.
- **All async thunks use `createAsyncThunk`** with typed `{ rejectValue: string }`.
- **Thunks call API functions** (not direct Axios). API layer is always separate.
- **Selectors are defined in the slice file** and use `RootState`.
- **Reducer state is normalized** — avoid deeply nested Redux state.
- **TanStack React Query** (declared in `package.json`) should be used for future server-data needs (policies, profiling questions, risk scores) rather than adding more Redux slices.

---

## 8. Form & Validation Standards

### Stack

- **`react-hook-form`** v7 for form state management.
- **`zod`** for schema validation.
- **`@hookform/resolvers`** (`zodResolver`) to bridge.

### Pattern

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'

const loginSchema = z.object({
  email: z.string().trim().min(1).email().transform(v => v.toLowerCase()),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    defaultValues: { email: '', password: '', rememberMe: false },
    resolver: zodResolver(loginSchema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input label="Email" error={errors.email?.message} {...register('email')} />
      ...
    </form>
  )
}
```

### Rules

- **Validation schemas live in `validation/<form>.schema.ts`** inside the feature module.
- **`z.infer<typeof schema>`** is the canonical way to derive the TypeScript type from the schema.
- **Password validation reuses a shared regex**: `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$`.
- **Cross-field validation** (password match) uses `.refine()` on the schema object, not a manual check in the submit handler.
- **`transform`** for normalization (lowercasing email, trimming strings) lives in the zod schema, not in the component or handler.
- **Error display** uses the shared `<Input>` component's `error` prop, not standalone error text.

### Password validation (shared regex)

```typescript
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/

z.string().min(1).min(8).regex(strongPasswordPattern, {
  message: 'Password must contain uppercase, lowercase, number, and special character',
})
```

---

## 9. Routing Standards

### Route structure

| Path | Component | Guard | Auth Required |
|------|-----------|-------|---------------|
| `/` | `HomePage` | None | No |
| `/login` | `LoginPage` | None | No |
| `/register` | `RegisterPage` | None | No |
| `/forgot-password` | `ForgotPasswordPage` | None | No |
| `/reset-password` | `ResetPasswordPage` | None | No |
| `/dashboard` | `DashboardPage` | `ProtectedRoute` | Yes |
| `/admin/dashboard` | `AdminDashboardPage` | `AdminRoute` | Yes + ADMIN role |
| `/admin/users` | `AdminUsersPage` | `AdminRoute` | Yes + ADMIN role |

### Route guard pattern

```typescript
function ProtectedRoute() {
  const location = useLocation()
  const { status, isAuthenticated, loadCurrentUser } = useAuth()

  if (status === 'idle' && !isAuthenticated) {
    loadCurrentUser()
    return <LoadingSpinner />
  }

  if (status === 'loading' || status === 'idle') {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
```

### Modal-overlay routing pattern

```typescript
function App() {
  const location = useLocation()
  const background = (location.state as any)?.backgroundLocation

  return (
    <>
      <Routes location={background ?? location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        ...
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Routes>

      {background && (
        <Routes>
          <Route path="/login" element={<AuthModal initialTab="login" onClose={...} />} />
          ...
        </Routes>
      )}
    </>
  )
}
```

### Rules

- **Modal routes** use React Router's `state.backgroundLocation` pattern — not a separate modal state manager.
- **Auth guards** use `<Outlet />` layout routes — not HOC wrappers, not render props.
- **Unauthenticated users** are redirected to `/login` with `state.from` preserving the original target for post-login redirect.
- **Non-admin users** accessing `/admin/*` are redirected to `/dashboard`.
- **Admin users** logging in are redirected to `/admin/dashboard`; regular users to `/dashboard`.

---

## 10. Constants & Configuration Standards

### Constants pattern

```typescript
export const AUTH_ENDPOINTS = {
  register: '/auth/register',
  login: '/auth/login',
  me: '/auth/me',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
} as const

export const AUTH_MESSAGES = {
  title: 'Welcome Back',
  subtitle: 'Sign in to your account',
  loginButton: 'Sign In',
  registerButton: 'Create Account',
  ...
} as const
```

### Rules

- **All constant objects use `as const`** to preserve literal types.
- **Environment variables** use `import.meta.env.VITE_*` prefix. Access them through the constants file, not inline.

```typescript
// constants.ts — centralize env var access
export const AUTH_API_BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/v1`
```

- **Magic strings** (endpoint paths, error messages, button labels) must be defined in constants, never inline in components or API files.
- **Session storage keys** use a consistent prefix: `ins_auth_session`.

---

## 11. Testing Standards

### Stack

- **Vitest** (Vite-native test runner, declared in `package.json`).
- **@testing-library/react** for component tests.
- **@testing-library/jest-dom** for DOM matchers.

### File structure

```
src/
└── features/
    └── auth/
        ├── __tests__/
        │   ├── LoginForm.test.tsx
        │   └── authApi.test.ts
        ├── LoginForm.tsx
        └── authApi.ts
```

Or co-located:
```
src/
└── components/
    └── Button/
        ├── Button.tsx
        ├── Button.module.css
        ├── index.ts
        └── Button.test.tsx
```

### What to test

| Concern | Approach |
|---------|----------|
| Component rendering | `render()`, `screen.getByText()`, `expect(...).toBeInTheDocument()` |
| User interaction | `fireEvent.click()`, `fireEvent.change()`, `waitFor()` |
| Form validation | Submit with invalid data, assert error messages appear |
| API service functions | Mock Axios, assert correct URL/method/body/headers |
| Redux slices | Dispatch actions, assert state changes |
| Route guards | Render with mocked auth state, assert redirect/navigation |

### Rules

- **Tests live next to the file they test** (co-located `__tests__/` or sibling `*.test.tsx`).
- **Use `describe`/`it` blocks** (not `test`).
- **Mock external dependencies** (API calls, browser APIs) — never call real endpoints.
- **Test behavior, not implementation** — assert on rendered output, not internal state.

---

## 12. Mandatory Rules

### TypeScript strict typing
- All files pass with `noUnusedLocals`, `noUnusedParameters`, `strictNullChecks` (implicit), and `noFallthroughCasesInSwitch`.
- The `noUncheckedIndexedAccess` flag should be treated as active (defensive access of arrays and objects).

### No usage of `any`
- If a type is genuinely unknown, use `unknown` and narrow with discriminated unions or type guards.
- If a third-party library lacks types, create a minimal `.d.ts` declaration — do not cast to `any`.

### Interfaces preferred
- Use `interface` for all object shapes — component props, Redux state, API response shapes, entities.
- Use `type` only for: unions (`type Status = 'a' \| 'b'`), intersections, mapped types, and primitive aliases.

### Functional components only
- No class components. No `React.FC`. No `React.Component`.
- All components are plain functions or `forwardRef` wrappers.

### Reusable components preferred
- Before creating UI in a page file, check if a reusable component already exists (`src/components/`).
- Shared UI patterns (buttons, inputs, checkboxes, modals, cards, spinners) must be extracted into `src/components/`.

### Tailwind-first styling approach
- There is no Bootstrap in this project. The styling architecture is:
  1. **CSS custom properties** for design tokens (in `variable.css`).
  2. **Tailwind utility classes** for layout and page-level styling.
  3. **CSS Modules** for scoped component styles.
- Use Tailwind classes before CSS Modules before inline styles.
- Never add Bootstrap or any other CSS framework without an ADR.

---

## 13. AI Agent Frontend Checklist

This checklist must be reviewed **before every frontend code generation task**.

### Pre-Generation

- [ ] I have read `PROJECT_OVERVIEW.md` to understand overall architecture.
- [ ] I have read `FRONTEND_CODING_STANDARDS.md` (this document).
- [ ] I have verified the target feature module exists or needs creation.
- [ ] I have verified no duplicate component exists in `src/components/` or `src/features/`.

### Architecture & Structure

- [ ] I am creating components as named functions with `export default`.
- [ ] I am using `interface` for props (not `type`).
- [ ] I am extending native HTML attribute types when wrapping HTML elements.
- [ ] I am placing reusable UI primitives in `src/components/`.
- [ ] I am placing feature-specific code in `src/features/<feature>/`.
- [ ] I am placing page components in `src/pages/`.
- [ ] I am placing custom hooks in `src/hooks/` or co-located with the feature.
- [ ] I am using barrel `index.ts` files for re-exports.

### TypeScript

- [ ] No `any` type is used anywhere.
- [ ] All function parameters and return types are annotated.
- [ ] `import type` is used for type-only imports.
- [ ] `as const` is used for constant objects.
- [ ] Interfaces are used for object shapes; `type` only for unions/utility types.

### Styling

- [ ] I am using design tokens from CSS variables (not hardcoded color values).
- [ ] I am using Tailwind utility classes as the primary styling approach.
- [ ] I am using CSS Modules for reusable component styles.
- [ ] I am not importing Bootstrap or any other CSS framework.

### State & Data Flow

- [ ] I am using Redux only for global shared state (auth, user session).
- [ ] I am using `useState` for local component state.
- [ ] API calls are in feature-specific modules (not inline in components).
- [ ] CamelCase ↔ snake_case mapping is in the API layer only.
- [ ] Error messages are extracted using the backend's `error` field convention.

### Forms

- [ ] I am using `react-hook-form` with `zodResolver`.
- [ ] Validation schemas are in separate `validation/<name>.schema.ts` files.
- [ ] Password validation reuses the shared `strongPasswordPattern` regex.
- [ ] Cross-field validation uses `.refine()` on the zod schema.

### Imports

- [ ] Imports follow the pattern: React/libraries → Redux → API → components → types/constants.
- [ ] `import type` is used for type-only imports.
- [ ] Environment variables are accessed through constants (not inline `import.meta.env`).

### Routing

- [ ] Route guards use `<Outlet />` layout route pattern.
- [ ] Modal routes use `state.backgroundLocation` pattern.
- [ ] Auth redirects preserve `state.from` for post-login navigation.

### Testing Awareness

- [ ] I have written / will write tests for new components and API functions.
- [ ] Tests mock all external dependencies (never call real endpoints).
- [ ] Tests are co-located with the file they test.
