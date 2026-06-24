# InsureTech — Database Schema

> **Authority**: This document is the source of truth for all database entities, relationships, constraints, and conventions. The SQLAlchemy ORM models in `backend/app/models/` and the Alembic migrations in `backend/alembic/versions/` are the ground-truth implementations.

---

## Table of Contents

1. [Configuration](#1-configuration)
2. [Naming Conventions](#2-naming-conventions)
3. [Mixin Base Classes](#3-mixin-base-classes)
4. [Entity Catalog](#4-entity-catalog)
   - 4.1 [roles](#41-roles)
   - 4.2 [users](#42-users)
   - 4.3 [password_reset_tokens](#43-password_reset_tokens)
   - 4.4 [segments](#44-segments)
   - 4.5 [industries](#45-industries)
   - 4.6 [business_profiles](#46-business_profiles)
   - 4.7 [risk_categories](#47-risk_categories)
   - 4.8 [risk_factors](#48-risk_factors)
   - 4.9 [questions](#49-questions)
   - 4.10 [question_factor_mappings](#410-question_factor_mappings)
   - 4.11 [answer_score_rules](#411-answer_score_rules)
   - 4.12 [profiling_sessions](#412-profiling_sessions)
   - 4.13 [profiling_answers](#413-profiling_answers)
   - 4.14 [business_risk_scores](#414-business_risk_scores)
   - 4.15 [insurance_categories](#415-insurance_categories)
   - 4.16 [insurers](#416-insurers)
   - 4.17 [policies](#417-policies)
   - 4.18 [policy_documents](#418-policy_documents)
   - 4.19 [document_chunks](#419-document_chunks)
   - 4.20 [recommendations](#420-recommendations)
   - 4.21 [reports](#421-reports)
5. [Entity Relationship Summary](#5-entity-relationship-summary)
6. [ERD Explanation](#6-erd-explanation)
7. [Cascade Behavior](#7-cascade-behavior)
8. [Soft Delete Strategy](#8-soft-delete-strategy)
9. [Audit Fields](#9-audit-fields)
10. [Multi-Tenancy Strategy](#10-multi-tenancy-strategy)
11. [pgvector Extension](#11-pgvector-extension)
12. [Migration History](#12-migration-history)
13. [Hard Rules](#13-hard-rules)

---

## 1. Configuration

| Parameter | Value | Source |
|-----------|-------|--------|
| Engine | PostgreSQL (async) | `backend/app/core/database.py` |
| Driver | `asyncpg` via `async` SQLAlchemy | `requirements.txt` |
| URL | `DATABASE_URL` env var | `backend/app/core/config.py` |
| Session factory | `async_sessionmaker(expire_on_commit=False)` | `database.py` |
| Migration tool | Alembic (async) | `alembic.ini` + `env.py` |
| Vector extension | pgvector | `requirements.txt` |
| ORM base | `declarative_base()` with custom naming convention | `backend/app/shared/base_model.py` |
| Connection pool | Default (`create_async_engine` — no custom pool settings) | `database.py` |
| Echo mode | `echo=True` (SQL logging enabled) | `database.py` |

---

## 2. Naming Conventions

Defined in `backend/app/shared/base_model.py`:

| Pattern | Format | Example |
|---------|--------|---------|
| Primary Key | `pk_%(table_name)s` | `pk_users` |
| Foreign Key | `fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s` | `fk_users_role_id_roles` |
| Unique | `uq_%(table_name)s_%(column_0_name)s` | `uq_users_email` |
| Index | `ix_%(column_0_label)s` | `ix_users_email` |
| Check | `ck_%(table_name)s_%(constraint_name)s` | — |

All tables use `MetaData` with this naming convention applied globally.

---

## 3. Mixin Base Classes

### `TimestampMixin`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `created_at` | `DateTime(timezone=True)` | `NOT NULL` | `func.now()` |
| `updated_at` | `DateTime(timezone=True)` | `NOT NULL` | `func.now()` |

Applied to: `Role`, `User`, `Segment`, `Industry`, `BusinessProfile`, `Question`, `ProfilingSession`, `ProfilingAnswer`, `AnswerScoreRule`, `RiskCategory`, `RiskFactor`, `InsuranceCategory`, `Insurer`, `Policy`, `Report`, `PasswordResetToken`.

**Not applied**: `QuestionFactorMapping`, `BusinessRiskScore`, `Recommendation`, `PolicyDocument`, `DocumentChunk` (these define their own or omit timestamps).

### `AuditMixin`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `created_by` | `UUID` (FK → `users.id`) | `NULL`, `ON DELETE RESTRICT` | — |
| `updated_by` | `UUID` (FK → `users.id`) | `NULL`, `ON DELETE RESTRICT` | — |

Applied to: `Segment`, `Industry` only.

---

## 4. Entity Catalog

### 4.1 `roles`

**Purpose**: Defines discrete user authorization levels.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `name` | `String` | `NOT NULL`, `UNIQUE` | — |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Indexes**: None beyond PK and unique on `name`.

**Relationships**: `users` (one-to-many → `User`).

---

### 4.2 `users`

**Purpose**: Registered platform users (both USER and ADMIN roles).

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `email` | `String` | `NOT NULL`, `UNIQUE` | — |
| `password_hash` | `Text` | `NOT NULL` | — |
| `full_name` | `String` | `NOT NULL` | — |
| `phone` | `String` | `NULL` | — |
| `role_id` | `UUID` | `NOT NULL`, `FK → roles.id` | — |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Unique Constraints**: `email`.

**Relationships**:
- `role` (M:1 → `Role`)
- `business_profiles` (1:M → `BusinessProfile`)
- `password_reset_tokens` (1:M → `PasswordResetToken`)

---

### 4.3 `password_reset_tokens`

**Purpose**: Tracks password reset flow with expiry and one-time-use semantics.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `user_id` | `UUID` | `NOT NULL`, `FK → users.id` | — |
| `token_hash` | `String` | `NOT NULL` | — |
| `expires_at` | `DateTime(tz)` | `NOT NULL` | — |
| `used_at` | `DateTime(tz)` | `NULL` | — |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Relationships**: `user` (M:1 → `User`).

---

### 4.4 `segments`

**Purpose**: High-level market segments (e.g., Manufacturing, Retail) that categorize industries.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `name` | `String` | `NOT NULL`, `UNIQUE` | — |
| `description` | `Text` | `NULL` | — |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_by` | `UUID` | `NULL`, `FK → users.id`, `ON DELETE RESTRICT` | — |
| `updated_by` | `UUID` | `NULL`, `FK → users.id`, `ON DELETE RESTRICT` | — |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Unique Constraints**: `name`.

**Relationships**:
- `industries` (1:M → `Industry`)
- `business_profiles` (1:M → `BusinessProfile`)

---

### 4.5 `industries`

**Purpose**: Specific industries within a market segment (e.g., Automotive under Manufacturing).

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `name` | `String` | `NOT NULL` | — |
| `segment_id` | `UUID` | `NOT NULL`, `FK → segments.id` | — |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_by` | `UUID` | `NULL`, `FK → users.id`, `ON DELETE RESTRICT` | — |
| `updated_by` | `UUID` | `NULL`, `FK → users.id`, `ON DELETE RESTRICT` | — |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Relationships**:
- `segment` (M:1 → `Segment`)
- `business_profiles` (1:M → `BusinessProfile`)

---

### 4.6 `business_profiles`

**Purpose**: Core business entity representing a user's organization. Central hub connecting users to profiling, risk, recommendations, and reports.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `user_id` | `UUID` | `NOT NULL`, `FK → users.id` | — |
| `industry_id` | `UUID` | `NOT NULL`, `FK → industries.id` | — |
| `segment_id` | `UUID` | `NOT NULL`, `FK → segments.id` | — |
| `business_name` | `String` | `NOT NULL` | — |
| `business_description` | `Text` | `NULL` | — |
| `city` | `String` | `NULL` | — |
| `state` | `String` | `NULL` | — |
| `address` | `Text` | `NULL` | — |
| `pincode` | `String` | `NULL` | — |
| `year_established` | `Integer` | `NULL` | — |
| `employee_count` | `Integer` | `NULL` | — |
| `annual_turnover_range` | `String` | `NULL` | — |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Relationships**:
- `user` (M:1 → `User`)
- `industry` (M:1 → `Industry`)
- `segment` (M:1 → `Segment`)
- `profiling_sessions` (1:M → `ProfilingSession`)
- `risk_scores` (1:M → `BusinessRiskScore`)
- `recommendations` (1:M → `Recommendation`)
- `reports` (1:M → `Report`)

---

### 4.7 `risk_categories`

**Purpose**: Top-level risk classification (e.g., Operational Risk, Financial Risk, Compliance Risk).

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `name` | `String` | `NOT NULL`, `UNIQUE` | — |
| `description` | `Text` | `NULL` | — |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Unique Constraints**: `name`.

**Relationships**:
- `risk_factors` (1:M → `RiskFactor`)
- `insurance_categories` (1:M → `InsuranceCategory`)
- `business_risk_scores` (1:M → `BusinessRiskScore`)
- `recommendations` (1:M → `Recommendation`)

---

### 4.8 `risk_factors`

**Purpose**: Individual measurable risk factors within a risk category, each with a configurable weight used in scoring.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `risk_category_id` | `UUID` | `NOT NULL`, `FK → risk_categories.id` | — |
| `factor_name` | `String` | `NOT NULL` | — |
| `description` | `Text` | `NULL` | — |
| `weight` | `Numeric` | `NOT NULL` | — |
| `order_index` | `Integer` | `NULL` | — |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Relationships**:
- `risk_category` (M:1 → `RiskCategory`)
- `question_mappings` (1:M → `QuestionFactorMapping`)
- `answer_score_rules` (1:M → `AnswerScoreRule`)

---

### 4.9 `questions`

**Purpose**: Underwriting wizard questions. Supports conditional branching via self-referencing FK.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `question_text` | `Text` | `NOT NULL` | — |
| `section` | `String` | `NOT NULL` | — |
| `question_type` | `String` | `NOT NULL` | — |
| `options` | `JSON` | `NULL` | — |
| `applicable_segment` | `String` | `NOT NULL` | `'both'` |
| `is_conditional` | `Boolean` | `NOT NULL` | `false` |
| `parent_question_id` | `UUID` | `NULL`, `FK → questions.id` (self) | — |
| `parent_answer_value` | `Text` | `NULL` | — |
| `order_index` | `Integer` | `NOT NULL` | — |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Self-Referencing FK**: `parent_question_id → questions.id`. Enables tree-structured conditional question trees.

**Relationships**:
- `parent_question` (M:1, self)
- `child_questions` (1:M, self)
- `factor_mappings` (1:M → `QuestionFactorMapping`)
- `answer_score_rules` (1:M → `AnswerScoreRule`)
- `profiling_answers` (1:M → `ProfilingAnswer`)

---

### 4.10 `question_factor_mappings`

**Purpose**: Many-to-many join between `questions` and `risk_factors`. Determines which risk factors a question contributes to.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `question_id` | `UUID` | `NOT NULL`, `FK → questions.id` | — |
| `risk_factor_id` | `UUID` | `NOT NULL`, `FK → risk_factors.id` | — |

**No timestamps** or audit columns.

**Relationships**:
- `question` (M:1 → `Question`)
- `risk_factor` (M:1 → `RiskFactor`)

---

### 4.11 `answer_score_rules`

**Purpose**: Maps a specific answer value for a question to a numeric score contribution for a risk factor.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `question_id` | `UUID` | `NOT NULL`, `FK → questions.id` | — |
| `risk_factor_id` | `UUID` | `NOT NULL`, `FK → risk_factors.id` | — |
| `answer_value` | `Text` | `NOT NULL` | — |
| `score` | `Numeric` | `NOT NULL` | — |
| `description` | `Text` | `NULL` | — |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Relationships**:
- `question` (M:1 → `Question`)
- `risk_factor` (M:1 → `RiskFactor`)

---

### 4.12 `profiling_sessions`

**Purpose**: A single run-through of the underwriting wizard for a business. Tracks progress and completion.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `business_id` | `UUID` | `NOT NULL`, `FK → business_profiles.id` | — |
| `status` | `String` | `NOT NULL` | `'in_progress'` |
| `current_section` | `String` | `NULL` | — |
| `completed_at` | `DateTime(tz)` | `NULL` | — |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Relationships**:
- `business_profile` (M:1 → `BusinessProfile`)
- `answers` (1:M → `ProfilingAnswer`)
- `risk_scores` (1:M → `BusinessRiskScore`)
- `recommendations` (1:M → `Recommendation`)
- `reports` (1:M → `Report`)

---

### 4.13 `profiling_answers`

**Purpose**: Stores individual answers submitted during a profiling session.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `session_id` | `UUID` | `NOT NULL`, `FK → profiling_sessions.id` | — |
| `question_id` | `UUID` | `NOT NULL`, `FK → questions.id` | — |
| `answer_value` | `Text` | `NOT NULL` | — |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Relationships**:
- `session` (M:1 → `ProfilingSession`)
- `question` (M:1 → `Question`)

---

### 4.14 `business_risk_scores`

**Purpose**: Per-category risk score result for a business from a single profiling session.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `business_id` | `UUID` | `NOT NULL`, `FK → business_profiles.id` | — |
| `session_id` | `UUID` | `NOT NULL`, `FK → profiling_sessions.id` | — |
| `risk_category_id` | `UUID` | `NOT NULL`, `FK → risk_categories.id` | — |
| `score` | `Numeric` | `NOT NULL` | — |
| `risk_level` | `String` | `NOT NULL` | — |
| `factor_breakdown` | `JSON` | `NULL` | — |
| `calculated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**No `TimestampMixin`** — uses explicit `calculated_at`.

**Relationships**:
- `business_profile` (M:1 → `BusinessProfile`)
- `session` (M:1 → `ProfilingSession`)
- `risk_category` (M:1 → `RiskCategory`)

---

### 4.15 `insurance_categories`

**Purpose**: Insurance product categories aligned to risk categories (e.g., Property Insurance → Physical Risk).

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `name` | `String` | `NOT NULL`, `UNIQUE` | — |
| `description` | `Text` | `NULL` | — |
| `risk_category_id` | `UUID` | `NULL`, `FK → risk_categories.id` | — |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Unique Constraints**: `name`.

**Relationships**:
- `risk_category` (M:1 → `RiskCategory`)
- `policies` (1:M → `Policy`)
- `recommendations` (1:M → `Recommendation`)

---

### 4.16 `insurers`

**Purpose**: Insurance provider companies who supply policies on the platform.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `name` | `String` | `NOT NULL` | — |
| `irdai_registration_no` | `String` | `NULL` | — |
| `website` | `String` | `NULL` | — |
| `logo_url` | `String` | `NULL` | — |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Relationships**:
- `policies` (1:M → `Policy`, cascade `all, delete-orphan`)
- `documents` (1:M → `PolicyDocument`)

---

### 4.17 `policies`

**Purpose**: Specific insurance policy products offered by insurers, linked to an insurance category.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `insurer_id` | `UUID` | `NOT NULL`, `FK → insurers.id` | — |
| `insurance_category_id` | `UUID` | `NOT NULL`, `FK → insurance_categories.id` | — |
| `policy_name` | `String` | `NOT NULL` | — |
| `policy_number` | `String` | `NULL` | — |
| `min_sum_insured` | `Numeric` | `NULL` | — |
| `max_sum_insured` | `Numeric` | `NULL` | — |
| `key_features` | `JSON` | `NULL` | — |
| `target_segment` | `String` | `NULL` | — |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Relationships**:
- `insurer` (M:1 → `Insurer`)
- `insurance_category` (M:1 → `InsuranceCategory`)
- `documents` (1:M → `PolicyDocument`, cascade `all, delete-orphan`)
- `document_chunks` (1:M → `DocumentChunk`, cascade `all, delete-orphan`)

---

### 4.18 `policy_documents`

**Purpose**: Uploaded policy documents (PDF, brochures) associated with a policy and insurer.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `policy_id` | `UUID` | `NOT NULL`, `FK → policies.id`, `ON DELETE CASCADE` | — |
| `insurer_id` | `UUID` | `NOT NULL`, `FK → insurers.id` | — |
| `doc_type` | `String(30)` | `NOT NULL` | — |
| `file_name` | `String(255)` | `NOT NULL` | — |
| `file_url` | `Text` | `NOT NULL` | — |
| `file_size` | `Integer` | `NULL` | — |
| `version` | `Integer` | `NOT NULL` | `1` |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Relationships**:
- `policy` (M:1 → `Policy`)
- `insurer` (M:1 → `Insurer`)
- `chunks` (1:M → `DocumentChunk`, cascade `all, delete-orphan`)

---

### 4.19 `document_chunks`

**Purpose**: Text chunks extracted from policy documents, each with a pgvector embedding for semantic search.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `policy_id` | `UUID` | `NOT NULL`, `FK → policies.id` | — |
| `document_id` | `UUID` | `NOT NULL`, `FK → policy_documents.id` | — |
| `chunk_index` | `Integer` | `NOT NULL` | — |
| `chunk_text` | `Text` | `NOT NULL` | — |
| `embedding` | `Vector(768)` | `NULL` | — |
| `page_number` | `Integer` | `NULL` | — |
| `document_metadata` | `JSONB` | `NULL` | — |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Vector Column**: `embedding` uses `Vector(768)` from `pgvector.sqlalchemy`. Requires pgvector extension on PostgreSQL.

**Relationships**:
- `policy` (M:1 → `Policy`)
- `document` (M:1 → `PolicyDocument`)

---

### 4.20 `recommendations`

**Purpose**: System-generated insurance recommendations for a business based on profiling session risk scores.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `business_id` | `UUID` | `NOT NULL`, `FK → business_profiles.id` | — |
| `session_id` | `UUID` | `NOT NULL`, `FK → profiling_sessions.id` | — |
| `insurance_category_id` | `UUID` | `NOT NULL`, `FK → insurance_categories.id` | — |
| `risk_category_id` | `UUID` | `NOT NULL`, `FK → risk_categories.id` | — |
| `risk_score` | `Numeric` | `NULL` | — |
| `risk_level` | `String` | `NULL` | — |
| `priority` | `String` | `NOT NULL` | — |
| `reason_text` | `Text` | `NOT NULL` | — |
| `is_active` | `Boolean` | `NOT NULL` | `true` |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**No `updated_at` column**. Does not inherit `TimestampMixin`.

**Relationships**:
- `business_profile` (M:1 → `BusinessProfile`)
- `session` (M:1 → `ProfilingSession`)
- `insurance_category` (M:1 → `InsuranceCategory`)
- `risk_category` (M:1 → `RiskCategory`)

---

### 4.21 `reports`

**Purpose**: Generated report artifacts (PDF) for a business profiling session.

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | `PK`, `gen_random_uuid()` | — |
| `business_id` | `UUID` | `NOT NULL`, `FK → business_profiles.id` | — |
| `session_id` | `UUID` | `NULL`, `FK → profiling_sessions.id` | — |
| `report_type` | `String` | `NOT NULL` | — |
| `file_url` | `Text` | `NULL` | — |
| `status` | `String` | `NOT NULL` | `'pending'` |
| `error_message` | `Text` | `NULL` | — |
| `generated_at` | `DateTime(tz)` | `NULL` | — |
| `created_at` | `DateTime(tz)` | `NOT NULL` | `now()` |
| `updated_at` | `DateTime(tz)` | `NOT NULL` | `now()` |

**Relationships**:
- `business_profile` (M:1 → `BusinessProfile`)
- `session` (M:1 → `ProfilingSession`)

---

## 5. Entity Relationship Summary

```
roles ──1:M──> users ──1:M──> password_reset_tokens
               │
               └──1:M──> business_profiles ──1:M──> profiling_sessions ──1:M──> profiling_answers
                              │                          │                        │
                              │                          │                        └──M:1──> questions (self-ref)
                              │                          │                                    │
                              │                          │                         1:M──> question_factor_mappings
                              │                          │                                    │
                              │                          │                         1:M──> answer_score_rules
                              │                          │                                    │
                              │                          └──1:M──> business_risk_scores──M:1──> risk_factors
                              │                                    │                        │
                              │                                    └──M:1──> risk_categories
                              │                                              │
                              │                                    ┌─────────┘
                              │                                    ▼
                              │                          insurance_categories ──1:M──> policies ──1:M──> policy_documents ──1:M──> document_chunks
                              │                                    │                  │
                              │                                    └──1:M──> recs      └──M:1──> insurers
                              └──1:M──> recommendations ──M:1────┘
                              └──1:M──> reports

segments ──1:M──> industries ──1:M──> business_profiles
```

---

## 6. ERD Explanation

The schema is organized into five bounded contexts:

### Identity & Access (`roles`, `users`, `password_reset_tokens`)
- `roles` is a static lookup table (seeded with `ADMIN`, `USER`).
- `users` is the actor table; `role_id` FK enforces RBAC at the database level.
- `password_reset_tokens` supports email-based password reset with one-time-use (`used_at`) and expiry (`expires_at`).

### Business Ontology (`segments`, `industries`, `business_profiles`)
- `segments` → `industries` is a two-level taxonomy.
- `business_profiles` is the central entity: it ties a `user` to their `industry` and `segment`, and is the parent for all downstream data (sessions, scores, recommendations, reports).

### Profiling & Risk Framework (`questions`, `question_factor_mappings`, `answer_score_rules`, `risk_categories`, `risk_factors`, `profiling_sessions`, `profiling_answers`, `business_risk_scores`)
- The underwriting wizard is defined as a directed graph of `questions` with self-referencing conditional branching (`parent_question_id` + `parent_answer_value`).
- Questions are linked to `risk_factors` via `question_factor_mappings`. Each answer value maps to a numeric `score` via `answer_score_rules`.
- A `profiling_session` collects `profiling_answers`, which are then evaluated to produce `business_risk_scores` — one per `risk_category`, with a `risk_level` label and a `factor_breakdown` JSON.

### Insurance Catalog (`risk_categories`, `insurance_categories`, `insurers`, `policies`, `policy_documents`, `document_chunks`)
- `risk_categories` is the bridge: it connects risk assessment outputs to insurance product categories.
- `insurance_categories` are product lines (e.g., Fire, Marine) optionally linked to a `risk_category`.
- `policies` are specific products from `insurers`. They carry `key_features` as JSON and `min_sum_insured`/`max_sum_insured` as Numeric ranges.
- `policy_documents` are uploaded files; `document_chunks` are their text fragments with `Vector(768)` embeddings for semantic search (pgvector).

### Outputs (`recommendations`, `reports`)
- `recommendations` are generated per business-session, per insurance category, with priority and human-readable reason text.
- `reports` track generated PDF artifacts with status lifecycle (`pending` → ... → URL or error).

---

## 7. Cascade Behavior

| Source Table | FK Column | Target Table | ON DELETE | ORM Cascade |
|-------------|-----------|-------------|-----------|-------------|
| `policy_documents` | `policy_id` | `policies` | `CASCADE` | — |
| `policy_documents` | — | `insurer` | default (NO ACTION) | `all, delete-orphan` (from Insurer side) |
| `document_chunks` | — | `policy` | default | `all, delete-orphan` (from Policy side) |
| `document_chunks` | — | `policy_document` | default | `all, delete-orphan` (from PolicyDocument side) |
| `segments.created_by` | `created_by` | `users` | `RESTRICT` | — |
| `segments.updated_by` | `updated_by` | `users` | `RESTRICT` | — |
| `industries.created_by` | `created_by` | `users` | `RESTRICT` | — |
| `industries.updated_by` | `updated_by` | `users` | `RESTRICT` | — |
| All other FKs | — | — | default (NO ACTION) | default (save-update, none on delete) |

**Summary**: Only `policy_documents` has explicit `ON DELETE CASCADE` at the FK constraint level. ORM-level cascades (`all, delete-orphan`) exist on `Insurer→PolicyDocument`, `Policy→PolicyDocument`, `Policy→DocumentChunk`, and `PolicyDocument→DocumentChunk` relationships. All other tables use the default NO ACTION, meaning orphaned rows will prevent parent deletion.

---

## 8. Soft Delete Strategy

The schema uses a **per-row boolean flag** pattern — not a true soft-delete with tombstone columns or deleted-at timestamps.

| Table | Soft Delete Column | Default |
|-------|-------------------|---------|
| `roles` | `is_active` | `true` |
| `users` | `is_active` | `true` |
| `segments` | `is_active` | `true` |
| `industries` | `is_active` | `true` |
| `business_profiles` | `is_active` | `true` |
| `risk_categories` | `is_active` | `true` |
| `risk_factors` | `is_active` | `true` |
| `questions` | `is_active` | `true` |
| `answer_score_rules` | `is_active` | `true` |
| `insurance_categories` | `is_active` | `true` |
| `insurers` | `is_active` | `true` |
| `policies` | `is_active` | `true` |
| `policy_documents` | `is_active` | `true` |
| `recommendations` | `is_active` | `true` |

**Tables without soft delete**: `profiling_sessions`, `profiling_answers`, `business_risk_scores`, `password_reset_tokens`, `question_factor_mappings`, `document_chunks`, `reports`, `recommendations` (has `is_active`).

**Convention**: All queries use `WHERE is_active = true` as a filter. There is no global query filter or `@where` annotation — filtering is the responsibility of the application layer. Deletion is logical (`UPDATE is_active = false`), never physical `DELETE`.

---

## 9. Audit Fields

Two mixin classes provide auditability:

### `TimestampMixin`
Every creation and update is timestamped:
- `created_at` — server default `now()`, non-nullable.
- `updated_at` — server default `now()`, non-nullable.

(Note: `updated_at` does **not** auto-update on row modification — it only holds the insert-time value unless explicitly set by application code.)

### `AuditMixin`
Applied to `segments` and `industries` only:
- `created_by` — nullable FK to `users.id`, `ON DELETE RESTRICT`.
- `updated_by` — nullable FK to `users.id`, `ON DELETE RESTRICT`.

Other tables (e.g., `business_profiles`, `profiling_sessions`) do **not** have user-audit columns. The `BusinessProfile` model does not inherit `AuditMixin`, despite being the most user-facing data entity.

---

## 10. Multi-Tenancy Strategy

**Not Implemented.**

All data exists in a single shared schema. There is no tenant isolation mechanism:
- No `tenant_id` column on any table.
- No row-level security policies.
- No schema-per-tenant pattern.
- Application-level filtering relies solely on `user_id` / `business_id` FK traversal.

If multi-tenancy is required in the future, the current FK paths (`user_id` on `business_profiles`) would allow tenant scoping at the application query layer without schema changes, but a formal tenant column on root entities would be recommended.

---

## 11. pgvector Extension

The `document_chunks.embedding` column uses `Vector(768)` from the `pgvector` extension.

**Requirements**:
- PostgreSQL must have the `vector` extension installed (`CREATE EXTENSION vector;`).
- The embedding dimensionality is fixed at **768** (compatible with many open-source embedding models like `intfloat/multilingual-e5-large` or `BAAI/bge-base-en-v1.5`).

**Current status**: The column exists in the schema (migration `45cb78b78a4e`), but no application code writes to or queries from it. The AI/RAG pipeline is not yet implemented.

---

## 12. Migration History

| Revision | Description | Dependencies |
|----------|-------------|-------------|
| `05c8ea653e53` | Added independent tables: roles, risk_categories, insurers | Initial |
| `7bede91e83b9` | Created users and risk_factors tables | `05c8ea653e53` |
| `526d9591c68d` | Created segments, insurance_categories, refresh_tokens | `7bede91e83b9` |
| `f727dde4d145` | Created industries and questions tables | `526d9591c68d` |
| `81b8b87524c5` | Created business_profiles table | `f727dde4d145` |
| `156f315bb5c0` | Created profiling_sessions table | `81b8b87524c5` |
| `e60d4da764e3` | Created question_factor_mappings and answer_score_rules | `156f315bb5c0` |
| `f0dd2fdff3e2` | Created profiling_answers table | `e60d4da764e3` |
| `35e5887b948e` | Created business_risk_scores table | `f0dd2fdff3e2` |
| `0fac261d7d7c` | Created policies, recommendations, reports tables | `35e5887b948e` |
| `cc11db0de77b` | Added AuditMixin FK columns (created_by/updated_by) with ON DELETE RESTRICT | `0fac261d7d7c` |
| `aafc6eb4727a` | Created password_reset_tokens table | `cc11db0de77b` |
| `bf2cb5858454` | Dropped refresh_tokens table | `aafc6eb4727a` |
| `45cb78b78a4e` | Added policy_documents and document_chunks (with pgvector) | `bf2cb5858454` |
| `542862545bfb` | Changed document_chunks.document_id from String to UUID, added FK | `45cb78b78a4e` |

**Key migration note**: The `refresh_tokens` table was created in `526d9591c68d` and dropped in `bf2cb5858454`. The current authentication uses JWT access/refresh tokens stored as httpOnly cookies, not persisted in the database.

---

## 13. Hard Rules

1. **The database schema is the source of truth.** All application code must derive its understanding of entities, relationships, and constraints from the ORM models and migration files in this document.

2. **AI agents may NOT modify models unless explicitly instructed.** Any schema change requires a new Alembic migration and an ADR documenting the rationale.

3. **AI agents must NOT create duplicate entities.** Before adding a new table, verify it does not already exist by checking `backend/app/models/__init__.py` and this document.

4. **AI agents must respect existing relationships.** FK constraints and relationship directions must not be altered without a migration. Adding a new cascade rule requires evaluating impact on all downstream queries.

5. **AI agents must reuse existing enums and constants.** The `applicable_segment` column on `questions` uses free-text values (`'manufacturing'`, `'retail'`, `'both'`). The `status` column on `profiling_sessions` uses `'in_progress'` and `'completed'`. The `status` column on `reports` uses `'pending'`. These must be treated as enums and not duplicated.

6. **No destructive operations on production data.** Soft delete (`is_active = false`) is the only permitted row removal mechanism. Physical `DELETE` is forbidden.

7. **All new entities must inherit `TimestampMixin`** unless explicitly exempted. If `AuditMixin` is needed, it must be added proactively rather than retrofitted.

8. **All UUID PKs** must use `server_default=text("gen_random_uuid()")`. This requires the `pgcrypto` extension on PostgreSQL.
