# P7

This workspace contains the `insuretech` application.

The main project is located inside `insuretech/` and includes:

- `insuretech/backend/` — FastAPI backend with PostgreSQL, authentication, admin and customer workflows, AI/RAG support, and email messaging.
- `insuretech/frontend/` — React + TypeScript + Vite frontend with user and admin experiences, onboarding, risk profiling, policy recommendations, and chat.
- `insuretech/docs/` — architecture documentation, API notes, and project references.
- `insuretech/data/` — insurance and policy data used by ingestion and scoring workflows.

## What this project does

InsureTech provides:

- user registration, login, profile, and authorization
- business risk assessment and insurer recommendations
- admin management of policies, insurers, categories, and users
- AI-powered question answering and conversational support
- file upload and Cloudinary-backed document handling
- email workflows for notifications and password reset

## Architecture overview

### Backend

- FastAPI app under `insuretech/backend/app`
- async PostgreSQL via SQLAlchemy + `asyncpg`
- Alembic migrations in `insuretech/backend/alembic`
- JWT auth and refresh tokens
- email support via FastAPI-Mail
- Cloudinary integration for uploads
- AI/RAG support using GROQ and embeddings
- API routes mounted at `/api/v1`

### Frontend

- React + TypeScript application with Vite
- Redux Toolkit, React Query, and React Router v7
- protected user and admin routes
- Axios API client in `insuretech/frontend/src/config/api.ts`
- UI pages for onboarding, risk profiling, recommendations, chat, and admin

## Local setup

### Backend

```bash
cd insuretech/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `insuretech/backend/.env` with database, auth, mail, and API settings.

Run migrations:

```bash
alembic upgrade head
```

Seed data if needed:

```bash
python seed.py
```

Start backend server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd insuretech/frontend
npm install
cp .env.example .env
```

Update `frontend/.env` with:

```env
VITE_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Workflow

- Backend development: edit `insuretech/backend/app`, run migrations, restart `uvicorn`.
- Frontend development: edit `insuretech/frontend/src`, Vite reloads automatically.
- The frontend uses `VITE_API_URL` and appends `/api/v1` for backend requests.
- CORS settings in `insuretech/backend/app/core/middleware.py` allow local frontend origins.

## Important files

- `insuretech/backend/app/core/config.py` — required backend environment variables and app settings
- `insuretech/backend/app/api/v1` — API routes
- `insuretech/backend/app/modules` — services for auth, policies, chat, and data workflows
- `insuretech/frontend/src/App.tsx` — app routing
- `insuretech/frontend/src/config/api.ts` — Axios API client

## Notes

- Keep secrets out of source control.
- If `GROQ_API_KEY` is missing, AI/RAG features may not function.
- Cloudinary settings are optional but should be configured for file uploads.

## More documentation

See `insuretech/README.md` for detailed backend and frontend instructions.

## Contact

If you need clarification, consult the maintainer or review `insuretech/docs/`.
