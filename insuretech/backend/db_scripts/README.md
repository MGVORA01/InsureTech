# Database Data & Seeding Scripts (`db_scripts/`)

This directory contains all prerequisite data, initialization scripts, and master orchestrators required for setting up the InsureTech database both locally and on a production deployment server.

---

## 📁 Directory Overview

| Script / File | Purpose |
| :--- | :--- |
| **`master_seed.py`** | Unified Python master runner that executes all database seed stages in exact dependency order. |
| **`seed_database.sh`** | Executable shell wrapper that runs `alembic upgrade head` followed by `master_seed.py`. |
| **`../seed/question.json`** | Question bank dataset used for seeding underwriting questions and risk calculation rules. |
| **`../seed/seed.py`** | Individual script for seeding roles (`ADMIN`, `USER`) and default admin user. |
| **`../seed/seed-segments.py`** | Individual script for seeding industry segments (`Industrial`, `Retail`). |
| **`../seed/seed-question.py`** | Individual script for seeding question matrix and scoring rules. |
| **`../app/scripts/link_categories.py`** | Post-ingestion linker mapping PDF insurance categories to questionnaire risk categories. |
| **`../app/scripts/set_policy_target_segment.py`** | Post-ingestion normalizer setting `target_segment = 'both'`. |

---

## 🚀 Execution Instructions

### Option 1: Run Full Automated Database Setup & Master Seed (Recommended)

From the `insuretech/backend/` folder:

```bash
# Run database migrations and all seed stages
./db_scripts/seed_database.sh
```

To skip processing PDF files (e.g. if uploading via Admin portal later or running on a lightweight server):

```bash
./db_scripts/seed_database.sh --skip-pdf-ingestion
```

---

### Option 2: Run Python Master Seed Direct

```bash
cd insuretech/backend
python db_scripts/master_seed.py
```

---

## 🔄 Execution Order & Dependency Chain

1. **Alembic Migrations** (`alembic upgrade head`): Creates database tables and vector extension `pgvector`.
2. **Roles & Admin User** (`run_stage_1`): Creates `ADMIN` and `USER` roles; seeds `admin@gmail.com`.
3. **Business Segments & Industries** (`run_stage_2`): Populates `Industrial` and `Retail` segments.
4. **Question Matrix & Risk Engine** (`run_stage_3`): Ingests `seed/question.json` into `questions`, `risk_categories`, `risk_factors`, `question_factor_mappings`, `answer_score_rules`.
5. **Policy PDF Document Ingestion** (`run_stage_4`): Ingests PDFs from `backend/data/` into vector store and database.
6. **Insurance Category Mapping** (`run_stage_5`): Links policy `InsuranceCategory` to `RiskCategory`.
7. **Target Segment Normalizer** (`run_stage_6`): Sets target segments for policies.

---

## 🔐 Default Admin Account

Upon running the seed script, the following admin user will be created:

- **Email**: `admin@gmail.com`
- **Password**: `Admin@123`

*Note: Update password after first sign-in on production environment.*
