# InsureTech Frontend Architecture

> Architecture contract for frontend developers and AI coding agents.

---

## Application Structure

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
    ├── main.tsx                       # Bootstrap: Provider + BrowserRouter + App
    ├── App.tsx                        # Route definitions, modal routing, session guard
    ├── index.css                      # Tailwind directives + global base styles
    │
    ├── api/                           # HTTP client infrastructure
    │   ├── baseApi.ts                 # Shared Axios instance (baseURL, withCredentials, interceptors)
    │   └── README.md
    │
    ├── store/                         # Redux store configuration
    │   ├── store.ts                   # configureStore with combined reducers
    │   └── README.md
    │
    ├── features/                      # Domain feature slices (the core of the app)
    │   ├── auth/                      # Auth: Redux slice, API, types, forms, validation
    │   ├── auth-modal/                # AuthModal component (reusable overlay)
    │   └── contact/                   # Contact form API only
    │
    ├── components/                    # Reusable UI primitives (shared across features)
    │   ├── Button/
    │   ├── Checkbox/
    │   └── Input/
    │
    ├── hooks/                         # Reusable custom React hooks
    │   ├── useAuth.ts                 # Auth selector + action dispatcher wrapper
    │   └── useSessionCheck.ts         # Session validation on app load
    │
    ├── layout/                        # Layout components (structural shells)
    │   └── AuthLayout.tsx
    │
    ├── pages/                         # Route-level page components (one per route)
    │   ├── HomePage.tsx
    │   ├── LoginPage.tsx
    │   ├── RegisterPage.tsx
    │   ├── ForgotPasswordPage.tsx
    │   ├── ResetPasswordPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── AdminDashboardPage.tsx
    │   └── AdminUsersPage.tsx
    │
    ├── Routes/                        # Route guard components
    │   ├── ProtectedRoute.tsx         # Auth guard (redirects to /login)
    │   └── AdminRoute.tsx             # Admin role guard (redirects to /dashboard)
    │
    ├── styles/                        # Design tokens and global stylesheets
    │   ├── variable.css               # CSS custom properties (brand, risk, surface, text colors)
    │   └── overlay-tokens.css
    │
    ├── types/                         # Shared TypeScript interfaces
    │   └── README.md
    │
    ├── constants/                     # App-wide constant values
    │   └── README.md
    │
    ├── assets/                        # Static images, SVGs
    │   └── ...
    │
    └── test/                          # Test files
        └── README.md
```

### Directory Purpose Table

| Directory | Purpose | Importable By |
|---|---|---|
| `api/` | Axios instance with `withCredentials` + base URL | All feature APIs |
| `store/` | Redux `configureStore`, `RootState`, `AppDispatch` types | App bootstrap, hooks |
| `features/` | Domain slices: Redux, API layer, components, schemas, types | Pages, other features (rare) |
| `components/` | Reusable UI primitives | Features, Pages, Layout |
| `hooks/` | Custom React hooks | Pages, Features |
| `layout/` | Page layout shells | Pages |
| `pages/` | Route-level components only | App.tsx (Routes) |
| `Routes/` | `<Outlet />`-based route guards | App.tsx |
| `styles/` | CSS custom properties / design tokens | Any CSS module via `var(--...)` |
| `types/` | Shared TS interfaces | Anywhere |

---

## Routing Strategy

### Route Tree

```
<BrowserRouter>
  <Routes location={background ?? location}>
    <Route path="/"                     element={<HomePage />} />
    <Route path="/login"                element={<LoginPage />} />
    <Route path="/register"             element={<RegisterPage />} />
    <Route path="/forgot-password"      element={<ForgotPasswordPage />} />
    <Route path="/reset-password"       element={<ResetPasswordPage />} />

    <Route element={<ProtectedRoute />}>             ← auth guard
      <Route path="/dashboard"          element={<DashboardPage />} />
    </Route>

    <Route element={<AdminRoute />}>                 ← admin role guard
      <Route path="/admin/dashboard"    element={<AdminDashboardPage />} />
      <Route path="/admin/users"        element={<AdminUsersPage />} />
    </Route>
  </Routes>

  {background ? (                                      ← modal overlay
    <Routes>
      <Route path="/login" element={<AuthModal initialTab="login" />} />
      <Route path="/register" element={<AuthModal initialTab="register" />} />
      ...
    </Routes>
  ) : null}
</BrowserRouter>
```

### Key Patterns

- **Dual-mode auth routes**: Auth pages render either as full-page (`LoginPage`, `RegisterPage`) or as modals over the HomePage. The `backgroundLocation` state (set when a user clicks a login/register link from the landing page) determines which mode.
- **Route guards are `<Outlet />` wrappers**: `ProtectedRoute` and `AdminRoute` each render `<Outlet />` for their children when the guard passes, or `<Navigate to="...">` when it fails.
- **Route-level pages only**: `pages/` contains one component per route. These components handle data loading, layout composition, and redirect logic. They may NOT be imported by other pages or features.
- **No nested routing within features**: Feature components (forms, lists) are rendered inline by pages, not via nested `<Route>` elements.

### Guard Logic

| Guard | Condition | Redirect |
|---|---|---|
| `ProtectedRoute` | `isAuthenticated === false` after loading | `/login` with `state.from` |
| `AdminRoute` | Not authenticated | `/login` |
| `AdminRoute` | `user.role !== "ADMIN"` | `/dashboard` |

Both guards call `loadCurrentUser()` on mount if `status === 'idle'` and show a centered spinner during loading.

---

## State Management Strategy

### Architecture: Redux Toolkit (RTK) + Local Component State

Two state categories exist:

| State Type | Location | Examples |
|---|---|---|
| **Global auth state** | Redux: `authSlice`, `passwordSlice` | `user`, `isAuthenticated`, `status`, `loading`, `error` |
| **Ephemeral UI state** | `useState` inside components | form inputs (via react-hook-form), modal open/close, scroll position, carousel index, contact form status |

### Redux Slice Pattern

```
store/
└── store.ts                     # configureStore with reducers

features/auth/
├── authSlice.ts                 # createSlice + createAsyncThunk
├── passwordSlice.ts             # Forgot/reset password slice
├── authApi.ts                   # HTTP calls (NOT a slice — pure axios functions)
├── auth.types.ts                # TypeScript interfaces
├── auth.constants.ts            # Endpoint URLs, messages, validation rules
└── validation/                  # Zod schemas
```

### Slice Conventions

- **`createAsyncThunk`** for all async operations (register, login, fetch current user, refresh, logout, forgot/reset password).
- **Three lifecycle states** tracked: `pending`, `fulfilled`, `rejected`.
- **`status` field** with literal union type: `'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'failed'`.
- **Selectors** defined at the bottom of each slice file (`selectAuth`, `selectAuthUser`, `selectIsAuthenticated`, etc.).
- **Thunks call the feature's API module** (`authApi.ts`), never Axios directly.
- **Error extraction**: `getAuthErrorMessage(error)` extracts the backend error from the `APIResponse.error` field or falls back to a generic message.

### Redux Store Shape

```typescript
{
  auth: {
    user: User | null
    isAuthenticated: boolean
    loading: boolean
    error: string | null
    status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'failed'
  },
  password: {
    loading: boolean
    error: string | null
    message: string | null
  }
}
```

### Rules

- **Do NOT put server cache in Redux**: Use Redux for auth state only. Server data (user lists, stats) belongs in local `useState` fetched directly via the API module. TanStack React Query is available in dependencies for future server state needs.
- **Do NOT put form state in Redux**: Use `react-hook-form` for all form state.
- **Do NOT put UI state (modals, toggles, carousel index) in Redux**: Use `useState` in the nearest common parent.
- **Thunks must use `rejectWithValue`**: Every `createAsyncThunk` must return `rejectWithValue(getAuthErrorMessage(error))` in the catch block.
- **Selectors must use `RootState`**: Import `RootState` from `store/store.ts` for typed selectors.

---

## API Communication Pattern

### Architecture

```
Component (Page / Form)
  │  calls
  ▼
Custom Hook (useAuth)           ← wraps dispatch + thunks
  │  dispatches
  ▼
Redux Thunk (createAsyncThunk)  ← calls API module
  │  calls
  ▼
Feature API Module (authApi.ts) ← Axios calls, data transformation
  │  uses
  ▼
Shared Axios Instance (baseApi.ts)
  │  baseURL = /api/v1, withCredentials: true
  ▼
Backend (FastAPI)
```

### Layer Rules

| Layer | Responsibility | Can Import |
|---|---|---|
| **Component** | Renders UI, triggers hook functions on events | hooks, components, schemas |
| **Hook** | Wraps dispatch + thunks, returns state | store, slice, types |
| **Thunk** | Orchestrates async flow, error handling | API module |
| **API module** | Axios requests, snake_case ↔ camelCase mapping, token management | api/baseApi, constants, types |
| **baseApi** | Shared Axios instance with `withCredentials: true` | nothing (it is the root) |

### Interceptors

The `authHttp` instance (extended from `baseApi`) has two interceptors:

1. **Request interceptor**: Attaches `Authorization: Bearer <token>` header if an in-memory access token exists.
2. **Response interceptor**: On 401, attempts a token refresh via `authApi.refreshToken()`, then retries the original request. This prevents the user from being logged out on token expiry.

### Response Unwrapping

```typescript
function unwrapData<T>(response: AxiosResponse<ApiEnvelope<T> | T>): T {
  const body = response.data
  if (body && typeof body === 'object' && 'data' in body && body.data !== null) {
    return body.data as T          // Unwraps { data: T, message, success }
  }
  return body as T                 // Pass through if not wrapped
}
```

### Endpoint Constants

Every feature defines endpoint paths and messages in a `*.constants.ts` file:

```typescript
export const AUTH_ENDPOINTS = {
  register: '/auth/register',
  login: '/auth/login',
  me: '/auth/me',
  logout: '/auth/logout',
  refresh: '/auth/refresh',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
} as const
```

### API Module Rules

- **Each feature has one API module** (e.g., `authApi.ts`, `contactApi.ts`).
- **API modules are plain objects/exported functions** — not classes or instances.
- **All functions are async** and return typed promises.
- **snake_case from backend → camelCase in frontend** happens inside the API module, never in components.
- **Token management** (setAccessToken, getAccessToken, clearSessionMarkers) lives in the API module, not in slices.

---

## Component Hierarchy

```
<App>
  ├── useSessionCheck()                ← session validation on mount
  │
  ├── <Routes>
  │   ├── <HomePage />                 ← landing page, carousel, contact form, auth modal trigger
  │   ├── <LoginPage>                  ← wraps <LoginForm />
  │   │   └── <LoginForm />            ← react-hook-form + zod
  │   │       └── <Input />, <PasswordInput />, <Checkbox />, <Button />
  │   ├── <RegisterPage>               ← wraps <RegisterForm />
  │   │   └── <RegisterForm />         ← react-hook-form + zod
  │   │       └── <Input />, <PasswordInput />, <PasswordRequirements />, <Button />
  │   ├── <ProtectedRoute>             ← auth guard
  │   │   └── <Outlet>
  │   │       └── <DashboardPage />    ← user dashboard, profile details
  │   ├── <AdminRoute>                 ← admin role guard
  │   │   └── <Outlet>
  │   │       ├── <AdminDashboardPage />  ← stats, quick actions
  │   │       └── <AdminUsersPage />      ← user table with pagination, status toggle
  │   └── ... (ForgotPassword, ResetPassword)
  │
  └── <AuthModal>                      ← modal overlay (if backgroundLocation)
      ├── <LoginForm />
      ├── <RegisterForm />
      ├── <ForgotPasswordForm />
      └── <ResetPasswordForm />
```

### Component Categorization

| Type | Location | Description |
|---|---|---|
| **Pages** | `pages/` | One per route. Handles data loading, redirects, layout. |
| **Feature Components** | `features/<name>/` | Domain-specific components (LoginForm, PasswordInput). May use shared components. |
| **Shared UI Primitives** | `components/` | Pure presentational components (Button, Input, Checkbox). No business logic. |
| **Layout Components** | `layout/` | Structural shells (AuthLayout with branding sidebar + form area). |
| **Route Guards** | `Routes/` | `<Outlet />` wrappers with auth/role checks. |

---

## Shared Component Strategy

### Directory Convention

Each shared component lives in its own directory with three files:

```
components/Button/
├── Button.tsx                # Component implementation
├── Button.module.css         # Scoped CSS Module styles
└── index.ts                  # Re-export: export { default } from './Button'
```

### Component Design Rules

- **All shared components accept `className`** to allow parent override of styling.
- **Props extend native HTML attributes** (`ButtonHTMLAttributes`, `InputHTMLAttributes`) to support standard `aria-*`, `disabled`, `placeholder`, etc.
- **Forward refs** are used when the component wraps a native input (`Input`, `PasswordInput` use `forwardRef` for react-hook-form integration).
- **CSS Modules are the default** for component-level styling. Tailwind utility classes and CSS variables (`var(--color-primary)`) provide consistent theming.
- **No business logic**: Shared components receive data and callbacks as props. They never import from features, hooks, or store.

### Current Shared Components

| Component | Props | Features |
|---|---|---|
| `Button` | `variant: 'primary' | 'secondary'`, `fullWidth`, `children` | focus-visible ring, disabled opacity, CSS var colors |
| `Input` | `label`, `error`, `rightElement`, `forwardRef` | label + input + error message, validation state styling, right-side slot (for password toggle) |
| `Checkbox` | `label`, checked state | visually hidden native input + styled pseudo-element |

### Adding New Shared Components

1. Create directory `components/<Name>/` with `Name.tsx`, `Name.module.css`, `index.ts`.
2. Accept `className` and allow override.
3. Use CSS custom properties from `styles/variable.css` for colors, radii, shadows.
4. Ensure all interactive elements have `focus-visible` outlines.
5. Export via barrel `index.ts`.

---

## Form Handling Strategy

### Stack

- **`react-hook-form`** v7 with `useForm` for form state and validation triggers.
- **`zod`** v4 for schema definition.
- **`@hookform/resolvers/zod`** to bridge React Hook Form and Zod.

### File Convention

```
features/auth/validation/
├── login.schema.ts              # Zod schema for login form
├── register.schema.ts           # Zod schema for register form
├── forgotPassword.schema.ts
└── resetPassword.schema.ts
```

### Pattern

```typescript
// 1. Define Zod schema with validation messages from constants
import { z } from 'zod'
import { AUTH_VALIDATION } from '../auth.constants'

export const loginSchema = z.object({
  email: z.string().trim().min(1, AUTH_VALIDATION.emailRequired)
    .email(AUTH_VALIDATION.emailInvalid)
    .transform(v => v.toLowerCase()),
  password: z.string().min(1, AUTH_VALIDATION.passwordRequired),
  rememberMe: z.boolean().optional().default(false),
})

// 2. Use in form component
const { formState: { errors }, handleSubmit, register } = useForm<LoginFormData>({
  defaultValues: { email: '', password: '', rememberMe: false },
  resolver: zodResolver(loginSchema),
})

// 3. Render fields with error propagation
<Input error={errors.email?.message} label="Email" {...register('email')} />
```

### Rules

- **Every form has a corresponding Zod schema file** in `features/<name>/validation/`.
- **Validation messages are defined in `*.constants.ts`**, not inline in schemas.
- **`noValidate` is set on `<form>` elements** to disable native browser validation and rely on Zod.
- **Error messages are displayed inline** beneath each field via the `error` prop on `Input`.
- **Form-level errors** (from Redux) are displayed above the submit button.
- **`onSubmit` is wrapped in try/catch** — errors from thunks are stored in Redux and displayed via the slice's `error` state.
- **`disabled={loading}` is set on submit buttons** during async operations.

---

## Error Handling Strategy

### Error Sources and Handling

| Source | Handler | Display |
|---|---|---|
| **Validation** (client-side) | Zod schema → field-level `errors` object | Inline below each `Input` via `error` prop |
| **API / Network** | `getAuthErrorMessage(error)` in thunk `catch` block | Redux `error` field → form-level alert above submit button |
| **Session expiry** | Axios 401 interceptor → auto-refresh | Silent (automatic retry) |
| **Unexpected** | `generic_exception_handler` on backend → 500 | `"Something went wrong. Please try again."` |

### Error Extraction From Backend

```typescript
export function getAuthErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>
    return (
      axiosError.response?.data?.error ??         // APIResponse.error field
      axiosError.response?.data?.message ??       // fallback
      AUTH_MESSAGES.genericError                  // generic fallback
    )
  }
  if (error instanceof Error) return error.message
  return AUTH_MESSAGES.genericError
}
```

### Response Interceptor Error Handling

```typescript
// authHttp interceptor
authHttp.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        await authApi.refreshToken()
        return authHttp(originalRequest)      // retry original request
      } catch (refreshError) {
        setAccessToken(null)
        clearSessionMarkers()
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)
```

### Rules

- **Never use `alert()`** for error display.
- **Form errors** must be displayed inline, not in a toast or banner.
- **API errors** must be shown as dismissible inline messages above the submit button.
- **Error messages must be user-friendly strings** — never show raw `error.response.data` or stack traces.
- **All async thunks must catch errors** and return `rejectWithValue`.

---

## Loading State Strategy

### Loading State Types

| Pattern | Location | Mechanism |
|---|---|---|
| **Page-level loading** | `ProtectedRoute`, `AdminRoute`, `LoginPage`, `DashboardPage` | `status === 'loading'` → centered spinner |
| **Form submission loading** | `LoginForm`, `RegisterForm`, `ForgotPasswordForm` | `loading` from Redux → `disabled` button + "Logging in..." text |
| **Data fetch loading** | `AdminDashboardPage`, `AdminUsersPage` | Local `useState<boolean>` → skeleton/spinner |
| **Initial session check** | `App.tsx` via `useSessionCheck` | `checking === true` → full-screen spinner before any routes |

### Implementation Patterns

**Auth loading (Redux-driven):**
```typescript
// Slice tracks pending state automatically
builder.addCase(loginUser.pending, (state) => {
  state.loading = true
  state.error = null
  state.status = 'loading'
})

// Component reads it
const { loading, error } = useAuth()
<Button disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
```

**Data fetch loading (local state):**
```typescript
const [statsLoading, setStatsLoading] = useState(true)
const [statsError, setStatsError] = useState(false)

const fetchStats = async () => {
  setStatsLoading(true)
  setStatsError(false)
  try {
    const res = await baseApi.get('/admin/stats')
    setStats(res.data.data)
  } catch {
    setStatsError(true)
  } finally {
    setStatsLoading(false)
  }
}

// Render
{statsLoading ? <StatSkeleton /> : <StatCard data={stats} />}
{statsError && <RetryBanner onRetry={fetchStats} />}
```

### Rules

- **Auth loading** must use Redux slice state (not local state) so that loading persists across component unmounts during navigation.
- **Data fetch loading** should use local `useState` — do not put server responses in Redux.
- **Skeleton loaders** are preferred over spinners for data cards and tables.
- **Submit button text must change** during loading (e.g., "Login" → "Logging in...").
- **Loading state must never block the entire page** — form-level loading disables only the submit button.
- **Error state must include a retry mechanism** for data fetches (e.g., retry button in banner).

---

# Hard Rules

### Page Rule

Pages are route-level only. A `pages/` component:

- Is referenced by exactly one `<Route>` in `App.tsx`.
- Must NOT be imported by another page, feature component, or shared component.
- May compose feature components, layout components, and shared components.
- Handles data loading, auth checks, and redirect logic.

### Component Reusability Rule

Shared components in `components/`:

- Must NOT import from `features/`, `hooks/`, `store/`, or `pages/`.
- Must accept `className` for parent override.
- Must use CSS Modules for scoped styling.
- Must accept standard HTML attributes via props extension.

### API Logic Separation Rule

- API logic must NOT exist inside presentation components.
- Components must call hooks or dispatch thunks — they must not call Axios, construct URLs, or parse response data.
- Data transformation (snake_case ↔ camelCase) must happen in the API module, never in the component.

### Type Centralization Rule

- Each feature has one `*.types.ts` file containing all interfaces for that feature.
- Shared types (API envelope, pagination) belong in `types/`.
- Types must NOT be defined inline in components or hooks.
- Backend response shapes must be typed in the API module, not guessed at runtime.

### Responsive UI Rule

- All pages and components must function at viewport widths down to 360px.
- Use CSS `clamp()`, `min/max`, `grid`, and `flexbox` for fluid layouts.
- Use Tailwind breakpoints (`sm:`, `md:`) for structural changes.
- Touch targets must be at least 44×44px.
- Text must not overflow or cause horizontal scroll on narrow screens.

---

# AI Agent Frontend Rules

These rules apply to all AI coding agents generating or modifying frontend code.

## Rule 1: Follow the Feature Module Pattern

Every feature under `features/<name>/` must follow this structure (existing features shown for reference):

```
features/auth/
├── index.ts                         # Barrel exports
├── authSlice.ts                     # Redux slice + async thunks
├── passwordSlice.ts                 # Forgot/reset password slice (if needed)
├── authApi.ts                       # Axios calls, data transformation
├── auth.types.ts                    # All TypeScript interfaces
├── auth.constants.ts                # Endpoint URLs, messages, validation strings
├── refreshTimer.ts                  # Token refresh utility
├── LoginForm.tsx / RegisterForm.tsx # Form components
├── PasswordInput.tsx                # Feature-specific compound components
├── PasswordRequirements.tsx         # Sub-components
├── LoginForm.module.css             # Scoped styles per component
├── validation/
│   ├── login.schema.ts              # Zod schemas
│   └── register.schema.ts
└── *.module.css                     # CSS Modules
```

Do not mix concerns — the API module (`authApi.ts`) only makes HTTP calls. The slice (`authSlice.ts`) only manages state transitions.

## Rule 2: One Async Thunk Per Action

Each API call must have exactly one `createAsyncThunk`. Do not inline `dispatch(fetchSomething())` inside a component's `useEffect` — create a thunk for it.

```typescript
// ✅ Correct
export const fetchUsers = createAsyncThunk('admin/fetchUsers', async (_, { rejectWithValue }) => {
  try {
    return await adminApi.getUsers()
  } catch (error) {
    return rejectWithValue(getAuthErrorMessage(error))
  }
})

// ❌ Wrong — API call inside a component
useEffect(() => {
  axios.get('/admin/users').then(setData)
}, [])
```

## Rule 3: Always Use `rejectWithValue` in Thunks

Every thunk must catch errors and return `rejectWithValue`. The catch block must use the feature's error extraction function.

```typescript
export const loginUser = createAsyncThunk<AuthResponse, LoginFormData, { rejectValue: string }>(
  'auth/loginUser',
  async (payload, { rejectWithValue }) => {
    try {
      return await authApi.login(payload)
    } catch (error) {
      return rejectWithValue(getAuthErrorMessage(error))
    }
  }
)
```

## Rule 4: Use `useForm` + `zodResolver` for All Forms

Every form must use `react-hook-form` with `zodResolver`. Do not use raw `<form>` with `onSubmit` + manual state.

```typescript
// ✅ Correct
const { register, handleSubmit, formState: { errors } } = useForm<T>({
  defaultValues: { ... },
  resolver: zodResolver(schema),
})

// ❌ Wrong — manual state management
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
```

## Rule 5: Centralize Validation Schemas in `validation/` Directory

Every form schema must be a separate file in `features/<name>/validation/<name>.schema.ts`. Do not define schemas inline inside components.

## Rule 6: Shared Components Must Be Directory-Scoped

Every shared component must have its own directory with `ComponentName.tsx`, `ComponentName.module.css`, and `index.ts` (barrel re-export). Import via `import Button from '../../components/Button'` or `import Input from '../../components/Input'`.

## Rule 7: Pages Must NOT Import Other Pages

`pages/LoginPage.tsx` must NOT import `pages/DashboardPage.tsx`. If a page needs shared layout, use `layout/` components. If a page needs a shared feature, import from `features/`.

## Rule 8: API Response Data Must Be Typed

Every Axios response handler must have a typed generic. Do not use `any` for response data.

```typescript
// ✅ Correct
const response = await authHttp.post<ApiEnvelope<AuthResponse>>(url, body)
const data = unwrapData<AuthResponse>(response)

// ❌ Wrong
const response = await authHttp.post(url, body)
const data = response.data
```

## Rule 9: CSS Custom Properties for Theming

All colors, radii, shadows, and spacing must use `var(--...)` references from `styles/variable.css`. Do not hardcode color values in CSS Modules.

```css
/* ✅ Correct */
color: var(--color-primary);
background: var(--color-surface);
border-radius: var(--radius-md);

/* ❌ Wrong */
color: #1a3a5c;
background: #ffffff;
border-radius: 8px;
```

## Rule 10: Do Not Mix Tailwind and CSS Modules in the Same Component

If a component uses CSS Modules (`.module.css`), it must NOT use Tailwind utility classes in the JSX. Pick one approach per component. Pages may use Tailwind directly in JSX without CSS Modules.

| Component Type | Styling Approach |
|---|---|
| Shared components (`components/`) | CSS Modules only |
| Feature components (`features/*.tsx`) | CSS Modules only |
| Pages (`pages/`) | Tailwind or CSS Modules |

## Rule 11: Use Skeleton Loaders for Data Fetching, Spinners for Auth

- **Auth loading (Redux pending)**: Full-page centered spinner.
- **Data cards / tables**: Skeleton placeholders matching the content shape.
- **Form submission**: Button state change (`disabled` + text change).
- Never show a spinner for form submission loading — use button text change.

## Rule 12: Every Feature Must Export Its Types

A feature's `index.ts` must export all public types, the API functions, and the Redux slice actions:

```typescript
export type { User, LoginFormData, RegisterFormData, AuthState } from './auth.types'
export { authApi } from './authApi'
export { authSlice, loginUser, registerUser, logoutUser } from './authSlice'
```

## Rule 13: Route Guards Must Use `<Outlet />` Pattern

Do not wrap individual route elements with auth logic inside `App.tsx`. Use composable `<Route element={<Guard />}>` wrappers that render `<Outlet />`.

```typescript
// ✅ Correct
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<DashboardPage />} />
</Route>

// ❌ Wrong
<Route path="/dashboard" element={
  <ProtectedRoute><DashboardPage /></ProtectedRoute>
} />
```

## Rule 14: Error Banners Must Include a Retry Action

If a data fetch fails and displays an error banner, that banner must include a button that re-triggers the fetch. Do not show a static error message with no recovery path.

## Rule 15: Keep Feature API Modules Separate

Each feature creates its own Axios instance or imports `baseApi` directly. Features must NOT share API modules. `authApi` is for auth only; `contactApi` is for contact only. Create a new API module for each new feature.
