# InsureTech

InsureTech is an insurer-focused application for business risk profiling, policy comparison, recommendations, and AI-supported customer assistance.

The project includes:

- `backend/` — FastAPI backend with PostgreSQL, SQLAlchemy, Alembic migrations, authentication, policy and insurer management, mail support, and AI/RAG workflows.
- `frontend/` — React + TypeScript + Vite user interface with authentication, dashboards, risk assessment, chat, and admin pages.
- `docs/` — Architecture notes, API references, and project documentation.
- `data/` — Insurance policy data and raw files used by ingestion workflows.

## Documentation layout

- `insuretech/backend/README.md` — backend setup, database, auth, AI, and deployment guidance
- `insuretech/frontend/README.md` — frontend setup, dev workflow, build, and routing notes

## What this project does

InsureTech enables:

- user registration, login, and profile management
- risk profiling workflows for business insurance assessment
- policy recommendations and comparison tools
- a chat assistant for insurance guidance
- admin control over users, policies, insurers, and categories
- AI-backed question-answering via GROQ and vector search flows

## Architecture overview

### Backend

- FastAPI application in `insuretech/backend/app`
- Async PostgreSQL support via SQLAlchemy and `asyncpg`
- Migrations using Alembic
- Authentication and JWT access tokens
- Email workflows via FastAPI-Mail
- Cloudinary integration for file uploads
- GROQ AI provider for conversational and RAG capabilities
- Modular route structure under `app/api/v1`

### Frontend

- React + TypeScript application built with Vite
- Redux Toolkit and React Query for state and API interactions
- React Router v7 for navigation and route protection
- Material UI icons and Tailwind-style utility CSS
- Public auth pages plus protected user and admin pages

### Data and AI

- Policy and question seed data in `insuretech/backend/seed/question.json`
- Generated ingestion outputs in `insuretech/backend/output/`
- RAG and vector workflows under `insuretech/backend/app/ai`
- Cloudinary support for policy file uploads
- AI question answering powered by `GROQ_API_KEY`

## Local setup

### Prerequisites

- Python 3.12+ (backend)
- Node.js 18+ / npm 10+ (frontend)
- PostgreSQL database
- MongoDB if using the AI/document store and ingestion tooling
- Optional: Cloudinary account for file storage
- Optional: GROQ API key for the chat/RAG assistant

### Backend setup

```bash
cd insuretech/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `insuretech/backend/.env` file with values similar to:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/insuretech
SECRET_KEY=supersecretvalue
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=30
MAIL_USERNAME=example@mail.com
MAIL_PASSWORD=mailpassword
MAIL_FROM=example@mail.com
MAIL_SERVER=smtp.mailserver.com
MAIL_PORT=587
FRONTEND_URL=http://localhost:5173
PROJECT_NAME=Insuretech
ENVIRONMENT=development
LOG_LEVEL=DEBUG
ECHO_SQL=False
EMBEDDING_MODEL=BAAI/bge-base-en-v1.5
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TEMPERATURE=0.7
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
LLAMA_PARSE_API_KEY=
COOKIE_SECURE=False
```

Run database migrations:

```bash
cd insuretech/backend
alembic upgrade head
```

Seed initial data if required:

```bash
python seed/seed.py
```

Start the backend service:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000/api/v1` and docs at `http://localhost:8000/docs`.

### Frontend setup

```bash
cd insuretech/frontend
npm install
cp .env.example .env
```

Update `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Then open the browser at `http://localhost:5173`.

## Development workflow

- Backend changes: modify `insuretech/backend/app`, run migrations, restart `uvicorn`.
- Frontend changes: edit `insuretech/frontend/src`, Vite hot reload updates automatically.
- API URL: `frontend` uses `import.meta.env.VITE_API_URL` and appends `/api/v1`.
- CORS is configured in `insuretech/backend/app/core/middleware.py` to allow the frontend origin.

## Project structure

### Backend important folders

- `app/api/v1` — route definitions
- `app/core` — config, middleware, logging, database, mail, cloudinary
- `app/models` — ORM models and schema definitions
- `app/modules` — domain services for auth, policies, profiling, RAG, and more
- `alembic/` — migration scripts

### Frontend important folders

- `src/App.tsx` — application routing and layout
- `src/config/api.ts` — Axios base API client
- `src/features` — feature modules for auth, profiling, chat, policies, recommendations
- `src/pages` — page-level route components
- `src/routes` — protected and admin route guards
- `src/store` — Redux store setup

## Key features

- User registration, login, password reset
- Admin dashboard for users, policies, insurers, and categories
- Risk profiling workflow with business-specific assessment
- Recommendations and policy comparison pages
- AI chat assistant and conversational support
- PDF upload and Cloudinary-backed storage
- Email notifications via FastAPI mail

## Known notes

- The backend reads secrets from `.env` using `pydantic-settings`.
- The frontend uses `VITE_API_URL` for backend requests.
- If `GROQ_API_KEY` is missing, AI chat and RAG features may degrade.
- Cloudinary integration is optional but recommended for policy document uploads.

## Useful commands

### Backend

- `pip install -r requirements.txt`
- `alembic upgrade head`
- `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- `pytest` (after adding tests)

### Frontend

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## Documentation

- `insuretech/frontend/FRONTEND_DOCUMENTATION.md` — frontend-specific docs
- `insuretech/docs/` — backend architecture and design notes

## License

This repository does not declare a specific license in the root README. Add the project license here if applicable.
