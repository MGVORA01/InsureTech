# InsureTech (Main Project Guide)

This is the main documentation entry point for the full InsureTech system.

InsureTech has two primary applications:

- **Backend API**: FastAPI + PostgreSQL + AI/RAG pipeline
- **Frontend Web App**: React + TypeScript + Vite user/admin interface

## Project structure

```text
insuretech/
├── backend/
├── frontend/
└── README.md  # this file
```

## Main docs

- Backend main doc: [`backend/README.md`](backend/README.md)
- Frontend main doc: [`frontend/README.md`](frontend/README.md)
- Frontend detailed reference: [`frontend/FRONTEND_DOCUMENTATION.md`](frontend/FRONTEND_DOCUMENTATION.md)
- AI/RAG details: [`backend/app/ai/README.md`](backend/app/ai/README.md)
- DB setup/seeding: [`backend/db_scripts/README.md`](backend/db_scripts/README.md)

## Local development

1. Start backend (`insuretech/backend`) using its README instructions.
2. Start frontend (`insuretech/frontend`) using its README instructions.
3. Ensure frontend environment points to backend API URL.

## Deployment note

If deployment is already working, keep this file as the single main index and update only the linked module READMEs when backend/frontend behavior changes.
