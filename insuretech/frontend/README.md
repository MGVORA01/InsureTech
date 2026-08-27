# InsureTech Frontend

This frontend delivers the InsureTech user and admin experience.
It is built with React, TypeScript, Vite, Redux Toolkit, React Query, and React Router.

## Architecture

- Framework: React + Vite
- Language: TypeScript
- State: Redux Toolkit + React Query
- Routing: React Router v7
- HTTP: Axios
- Styling: Tailwind-style utilities and custom CSS

## Key responsibilities

- user authentication and onboarding
- business risk profiling and insurer recommendations
- policy comparison and detail pages
- AI chat and assistance
- admin dashboards for users, policies, and insurers

## Setup

```bash
cd insuretech/frontend
npm install
cp .env.example .env
```

Update `insuretech/frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

## Run locally

```bash
npm run dev
```

Open the app in the browser at `http://localhost:5173`.

## Important files

- `src/App.tsx` — application routing and page layout
- `src/config/api.ts` — Axios API client configuration
- `src/pages` — page components for user and admin flows
- `src/features` — feature modules for auth, profiling, chat, and policy workflows
- `src/routes` — protected and admin route guards
- `src/store` — Redux store setup

## Frontend workflow

- Run `npm run dev` during development to use Vite hot module replacement.
- Keep the backend running at `VITE_API_URL` for API access.
- Use `npm run build` to create a production bundle.

## Build and production

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Developer guidance

- Keep API endpoint paths in sync with backend route definitions.
- Use feature modules to isolate domain behavior.
- Keep UI state minimal and delegate data caching to React Query.
- Document new page routes and auth requirements in `src/routes`.
