#!/usr/bin/env bash
# ==============================================================================
# InsureTech Database Setup & Seeding Script
# ==============================================================================
# Executes Alembic database migrations and triggers the master seed script.
#
# Usage:
#   chmod +x db_scripts/seed_database.sh
#   ./db_scripts/seed_database.sh [--skip-pdf-ingestion]
# ==============================================================================

set -e

# Resolve directory locations
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=================================================="
echo "InsureTech Production Database Setup & Master Seed"
echo "=================================================="
echo "Backend directory: ${BACKEND_DIR}"

cd "${BACKEND_DIR}"

# Step 1: Run Database Migrations via Alembic
echo "Step 1: Running Alembic database migrations..."
alembic upgrade head

# Step 2: Execute Master Seeding Pipeline
echo "Step 2: Running Master Seed Pipeline..."
python db_scripts/master_seed.py "$@"

echo "Database initialization and seeding completed successfully!"
