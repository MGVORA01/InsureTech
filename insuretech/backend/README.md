# InsureTech Backend

This backend is the API and business logic layer for the InsureTech application.
It provides insurance risk profiling, policy management, authentication, admin workflows,
AI/RAG support, email delivery, and integration with PostgreSQL and Cloudinary.

## Architecture

- Framework: FastAPI
- Database: PostgreSQL (`asyncpg` + SQLAlchemy)
- Migrations: Alembic
- Authentication: JWT access and refresh tokens
- Email: FastAPI-Mail
- File storage: Cloudinary
- AI provider: GROQ for embeddings, chat, and RAG flows

## Key responsibilities

- user registration, login, and profile management
- policy, insurer, category, and quote management
- risk assessment and recommendation workflows
- admin reporting and user management
- AI-enabled question answering and chat support
- email notifications and password recovery

## Setup

```bash
cd insuretech/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in `insuretech/backend/` with the required settings.

### Required environment variables

- `DATABASE_URL` – PostgreSQL DSN, e.g. `postgresql+asyncpg://user:pass@localhost:5432/insuretech`
- `SECRET_KEY` – signing key for JWT tokens
- `ALGORITHM` – JWT algorithm, typically `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_FROM`
- `MAIL_SERVER`
- `MAIL_PORT`
- `FRONTEND_URL`
- `PROJECT_NAME`
- `ENVIRONMENT`
- `LOG_LEVEL`
- `ECHO_SQL`
- `EMBEDDING_MODEL`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `GROQ_TEMPERATURE`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `LLAMA_PARSE_API_KEY`
- `COOKIE_SECURE`

> Note: Keep `.env` local and do not commit secrets into source control.

## Database

Run migrations after creating the database and configuring `.env`:

```bash
cd insuretech/backend
alembic upgrade head
```

If the backend includes seed scripts, use them to load initial metadata and default data:

```bash
python seed/seed.py
```

## Run locally

Start the backend server for development:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI and API docs are available at `http://localhost:8000/docs`.

## Folder structure

- `app/api/v1` — REST endpoints and route definitions
- `app/core` — configuration, database setup, middleware, mail, and helpers
- `app/models` — ORM models, schemas, and DTOs
- `app/modules` — domain services and business logic
- `app/ai` — AI and RAG utilities, embeddings, and chat integration
- `alembic` — migration environment configuration and scripts

## Deployment notes

- Configure `DATABASE_URL` for the target environment.
- Use secure secrets for `SECRET_KEY`, mail credentials, and Cloudinary.
- Ensure CORS is set for the frontend host via `app/core/middleware.py`.
- Monitor `LOG_LEVEL` for production readiness.

## Professional developer guidance

- Treat backend config as environment-specific and document deploy variables.
- Keep the backend API contract stable for frontend integration.
- Use migrations to manage schema changes and avoid manual database edits.
- Validate AI key availability before enabling RAG and chat endpoints.
