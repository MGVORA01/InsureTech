#!/usr/bin/env python3
"""
InsureTech Master Database Seeding Pipeline
===========================================

Orchestrates complete database initialization and data seeding in the correct dependency order:
1. Roles & Admin User Seeding (ADMIN role, USER role, default system admin)
2. Business Segments & Industry Categories Seeding
3. Underwriting Wizard Questionnaire & Risk Scoring Engine Seeding (question.json)
4. Policy PDF Document Ingestion & Vector Indexing (Optional: if PDFs exist in backend/data)
5. Category Mapping: Link Insurance Categories to Risk Categories
6. Policy Target Segment Normalization: Set target_segment='both'

Usage:
    cd insuretech/backend
    python db_scripts/master_seed.py [--skip-pdf-ingestion]
"""

import sys
import os
import argparse
import asyncio
import logging
from pathlib import Path

# Ensure backend root directory is in sys.path and set as CWD
BACKEND_ROOT = Path(__file__).resolve().parents[1]
os.chdir(BACKEND_ROOT)
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("master_seed")


async def run_stage_1_roles_and_admin():
    """Stage 1: Seed Roles and Admin User."""
    logger.info("==================================================")
    logger.info("STAGE 1: Seeding Roles and Admin User...")
    logger.info("==================================================")
    
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.users import User
    from app.models.roles import Role
    from app.modules.auth.password_hashing import hash

    async with AsyncSessionLocal() as db:
        # Create ADMIN role
        result = await db.execute(select(Role).where(Role.name == "ADMIN"))
        admin_role = result.scalar_one_or_none()
        if not admin_role:
            admin_role = Role(name="ADMIN")
            db.add(admin_role)

        # Create USER role
        result = await db.execute(select(Role).where(Role.name == "USER"))
        user_role = result.scalar_one_or_none()
        if not user_role:
            user_role = Role(name="USER")
            db.add(user_role)

        await db.commit()
        await db.refresh(admin_role)
        await db.refresh(user_role)

        # Create default Admin User
        admin_email = "admin@gmail.com"
        admin_user_result = await db.execute(select(User).where(User.email == admin_email))
        existing_admin = admin_user_result.scalar_one_or_none()

        if not existing_admin:
            admin_user = User(
                email=admin_email,
                password_hash=hash("Admin@123"),
                full_name="System Admin",
                phone="7234567891",
                role_id=admin_role.id
            )
            db.add(admin_user)
            await db.commit()
            logger.info("Successfully created default System Admin (%s)", admin_email)
        else:
            logger.info("Admin user (%s) already exists. Skipping.", admin_email)

    logger.info("Stage 1 Complete!\n")


async def run_stage_2_segments_and_industries():
    """Stage 2: Seed Business Segments and Industry Categories."""
    logger.info("==================================================")
    logger.info("STAGE 2: Seeding Business Segments and Industries...")
    logger.info("==================================================")
    
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.industries import Industry
    from app.models.segments import Segment

    SEGMENTS = {
        "Industrial": {
            "description": "Companies that produce physical goods",
            "industries": ["Textile Manufacturing", "Furniture Manufacturing", "Paper Products Manufacturing"],
        },
        "Retail": {
            "description": "Businesses that sell goods directly to consumers",
            "industries": ["Garment & Footwear Shop", "Electronics Store", "Stationery Store"],
        },
    }

    async with AsyncSessionLocal() as db:
        for seg_name, seg_data in SEGMENTS.items():
            result = await db.execute(select(Segment).where(Segment.name == seg_name))
            segment = result.scalar_one_or_none()

            if not segment:
                segment = Segment(name=seg_name, description=seg_data["description"])
                db.add(segment)
                await db.flush()
                logger.info("Created Segment: %s", seg_name)

            for ind_name in seg_data["industries"]:
                ind_result = await db.execute(
                    select(Industry).where(
                        Industry.name == ind_name, Industry.segment_id == segment.id
                    )
                )
                existing_industry = ind_result.scalar_one_or_none()

                if not existing_industry:
                    industry = Industry(name=ind_name, segment_id=segment.id)
                    db.add(industry)
                    logger.info("Created Industry: %s (Segment: %s)", ind_name, seg_name)

        await db.commit()

    logger.info("Stage 2 Complete!\n")


async def run_stage_3_questionnaire_and_rules():
    """Stage 3: Seed Underwriting Wizard Questionnaire & Scoring Rules."""
    logger.info("==================================================")
    logger.info("STAGE 3: Seeding Questionnaire & Risk Engine...")
    logger.info("==================================================")
    
    question_json_path = BACKEND_ROOT / "seed" / "question.json"
    if not question_json_path.exists():
        logger.warning("question.json not found at %s. Skipping Stage 3.", question_json_path)
        return

    import importlib.util
    seed_question_file = BACKEND_ROOT / "seed" / "seed-question.py"
    
    spec = importlib.util.spec_from_file_location("seed_question_module", seed_question_file)
    seed_question_mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(seed_question_mod)

    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        await seed_question_mod.seed_underwriting_wizard(db, str(question_json_path))

    logger.info("Stage 3 Complete!\n")


def run_stage_4_policy_ingestion(skip_pdf: bool = False):
    """Stage 4: Ingest Policy PDFs and populate vector index."""
    logger.info("==================================================")
    logger.info("STAGE 4: Ingesting Policy PDFs into Vector DB...")
    logger.info("==================================================")

    if skip_pdf:
        logger.info("Flag --skip-pdf-ingestion set. Skipping Stage 4.")
        return

    data_dir = BACKEND_ROOT / "data"
    if not data_dir.exists() or not data_dir.is_dir():
        logger.warning("Data directory %s does not exist. Skipping Stage 4.", data_dir)
        return

    # Check if there are PDF files in data directory recursively
    pdf_files = list(data_dir.rglob("*.pdf"))
    if not pdf_files:
        logger.info("No PDF files found in %s. Skipping PDF ingestion.", data_dir)
        return

    logger.info("Found %d PDF file(s) in %s. Starting ingestion pipeline...", len(pdf_files), data_dir)
    try:
        from app.ai.ingestion.pipeline.ingestion_orchestrator import run_full_pipeline
        run_full_pipeline(data_dir=data_dir, skip_extract=False)
        logger.info("Stage 4 Complete!\n")
    except Exception as e:
        logger.error("Error during PDF ingestion: %s", str(e), exc_info=True)
        logger.warning("Continuing with remaining seed steps...\n")


async def run_stage_5_link_categories():
    """Stage 5: Link Insurance Categories to Risk Categories."""
    logger.info("==================================================")
    logger.info("STAGE 5: Linking Insurance Categories to Risk Categories...")
    logger.info("==================================================")
    
    from app.scripts.link_categories import link_categories
    await link_categories()
    logger.info("Stage 5 Complete!\n")


async def run_stage_6_set_target_segments():
    """Stage 6: Normalize Policy Target Segments."""
    logger.info("==================================================")
    logger.info("STAGE 6: Setting Policy Target Segments...")
    logger.info("==================================================")
    
    from app.scripts.set_policy_target_segment import set_target_segment
    await set_target_segment()
    logger.info("Stage 6 Complete!\n")


async def main_async(skip_pdf: bool = False):
    """Run all database seeding stages in order."""
    logger.info("Starting InsureTech Master Database Seeding Pipeline...")
    
    # 1. Roles & Admin
    await run_stage_1_roles_and_admin()

    # 2. Segments & Industries
    await run_stage_2_segments_and_industries()

    # 3. Questionnaire & Risk Engine Rules
    await run_stage_3_questionnaire_and_rules()

    # 4. Policy PDF Ingestion (Synchronous heavy ML/PDF process)
    run_stage_4_policy_ingestion(skip_pdf=skip_pdf)

    # 5. Link Insurance Categories to Risk Categories
    await run_stage_5_link_categories()

    # 6. Normalize Policy Target Segments
    await run_stage_6_set_target_segments()

    logger.info("==================================================")
    logger.info("🎉 MASTER DATABASE SEEDING COMPLETED SUCCESSFULLY!")
    logger.info("==================================================")


def main():
    parser = argparse.ArgumentParser(description="Master Database Seeding Pipeline")
    parser.add_argument(
        "--skip-pdf-ingestion",
        action="store_true",
        help="Skip PDF extraction and embedding stage",
    )
    args = parser.parse_args()

    asyncio.run(main_async(skip_pdf=args.skip_pdf_ingestion))


if __name__ == "__main__":
    main()
