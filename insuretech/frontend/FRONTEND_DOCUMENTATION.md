# Frontend Documentation

## 1. Overview

This frontend is a React + TypeScript application built with Vite. It provides a customer-facing insurance experience where users can:

- register and log in
- manage their business profile
- complete risk profiling
- view recommendations
- compare insurance policies
- use chat-based support flows
- access admin pages for policy management

The app is organized around feature folders, shared UI components, pages, and route protection.

---

## 2. Project Structure

```text
frontend/
  src/
    App.tsx
    main.tsx
    index.css
    components/
    config/
    constants/
    features/
    hooks/
    layouts/
    pages/
    routes/
    services/
    store/
    styles/
    utils/
```

### Main folders

- components: reusable UI building blocks such as buttons, input, sidebars, dialogs, and shared UI wrappers.
- features: feature-based modules for auth, profiling, recommendations, feedback, policies, profile, and chat.
- pages: route-level screen components that compose the features.
- routes: route guards for authenticated and admin-only access.
- hooks: custom hooks for shared behaviors such as auth and session checks.
- services: API client wrappers and shared network setup.
- store: Redux store configuration.
- layouts: shared page layout wrappers such as the user layout.
- utils: helper modules and reusable logic.

---

## 3. Entry Points

### main.tsx

The application starts here. It:

- mounts the React app into the root DOM element
- provides the Redux store through Provider
- wraps the app with BrowserRouter

### App.tsx

This is the main application shell. It defines the route structure and uses route guards for protected and admin-only pages.

---

## 4. State Management

The app uses Redux Toolkit for global state.

### Store

The store is defined in [frontend/src/store/store.ts](src/store/store.ts). It currently contains:

- auth reducer
- password reducer

### Auth state

Auth-related state and async actions live in [frontend/src/features/auth/authSlice.ts](src/features/auth/authSlice.ts). This handles:

- login
- registration
- user fetch
- token refresh
- logout
- authentication status

---

## 5. Routing and Access Control

Routes are defined in [frontend/src/App.tsx](src/App.tsx).

### Public routes

These pages are available without login:

- home
- login
- register
- forgot password
- reset password

### Protected routes

The [frontend/src/routes/ProtectedRoute.tsx](src/routes/ProtectedRoute.tsx) component ensures only authenticated users can access:

- dashboard
- recommendations
- chat
- policy comparison

### Admin routes

The [frontend/src/routes/AdminRoute.tsx](src/routes/AdminRoute.tsx) component restricts access to admin-only sections such as:

- admin dashboard
- admin users
- admin policies
- admin insurers
- admin categories

---

## 6. Feature Modules

### Auth feature

Location: [frontend/src/features/auth](src/features/auth)

This module covers:

- login and registration forms
- password reset and forgot-password flows
- auth API calls
- auth slice and reducers
- validation schemas

### Profile feature

Location: [frontend/src/features/profile](src/features/profile)

This provides the business profile experience, including:

- profile form
- profile card UI
- profile API integration
- profile validation

### Profiling feature

Location: [frontend/src/features/profiling](src/features/profiling)

This module is responsible for:

- risk profiling workflow
- wizard-based assessment experience
- launcher UI
- results display
- profiling API calls

### Recommendations feature

Location: [frontend/src/features/recommendations](src/features/recommendations)

This module handles recommendation generation and report-related actions, including:

- generating recommendations
- downloading recommendation PDFs
- recommendation type definitions

### Policies feature

Location: [frontend/src/features/policies](src/features/policies)

This module supports policy management and policy-related UI, including:

- policy tables
- insurer management
- category management
- policy upload dialogs

### Feedback feature

Location: [frontend/src/features/feedback](src/features/feedback)

This part of the app collects feedback and displays feedback content.

### Chat feature

Location: [frontend/src/features/chat](src/features/chat)

This feature provides chat popup and conversation support experience.

---

## 7. Pages

Pages are route-level containers that combine layouts and feature components.

### User-facing pages

- HomePage
- LoginPage
- RegisterPage
- ForgotPasswordPage
- ResetPasswordPage
- DashboardPage
- RecommendationsPage
- PolicyComparisonPage
- ChatPage

### Admin pages

- AdminDashboardPage
- AdminUsersPage
- AdminPoliciesPage
- AdminInsurersPage
- AdminCategoriesPage

These pages are responsible for composing the UI and passing state into the relevant feature components.

---

## 8. UI and Layout

The UI uses a combination of:

- React components
- Tailwind CSS classes
- Material UI icons/components
- custom shared UI wrappers

### Shared layout

The [frontend/src/layouts/UserLayout.tsx](src/layouts/UserLayout.tsx) file provides a reusable shell for authenticated user pages.

### Sidebar components

The app includes sidebars for:

- user navigation
- admin navigation

These are implemented in the components folder and used by the admin and user pages.

---

## 9. API Layer

The API layer is centered around:

- [frontend/src/config/api.ts](src/config/api.ts)
- [frontend/src/services/api.ts](src/services/api.ts)
- feature-specific API modules such as [frontend/src/features/auth/authApi.ts](src/features/auth/authApi.ts)

The base API client uses Axios and reads the backend base URL from environment variables.

### Authentication API

The auth API module handles:

- login
- registration
- current user fetch
- password reset
- token storage and session markers

---

## 10. Styling and Design

The frontend uses:

- Tailwind CSS for layout and responsiveness
- custom CSS variables for theme values
- component-level styling for cards, panels, and dashboards

The main CSS entry point is [frontend/src/index.css](src/index.css).

---

## 11. Development Workflow

### Install dependencies

```bash
cd frontend
npm install
```

### Run locally

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Lint the codebase

```bash
npm run lint
```

---

## 12. Notes for Future Maintenance

To keep the project healthy and easy to maintain:

- keep feature modules isolated by responsibility
- use shared components for repeated UI patterns
- keep pages thin and move business logic into features or hooks
- keep route guards centralized
- prefer typed API responses and shared types
- avoid putting page-specific logic directly inside shared components

---

## 13. Summary

This frontend is a structured, feature-based React application for managing insurance-related workflows. The architecture is organized around:

- clear route boundaries
- Redux-driven auth state
- feature-based modules
- reusable UI components
- API integration for backend communication

It is suitable for continued growth and can be extended with more features while keeping the codebase readable and maintainable.
