"""Link Insurance Categories (from PDF folders) to Risk Categories (from seed data).

After the ingestion pipeline creates InsuranceCategory records from folder names,
this script maps each to the correct RiskCategory so the recommendation engine
can match risk scores to policies.

Usage:
    cd backend
    source .venv/bin/activate
    python -m app.scripts.link_categories
"""

import asyncio
import logging

from sqlalchemy import select, update

from app.core.database import AsyncSessionLocal
from app.models import InsuranceCategory, RiskCategory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FOLDER_TO_RISK_CATEGORY = {
    "Fire & Property": "Fire Risk",
    "Liability": "Public Liability",
    "Machinery Breakdown": "Machinery/Equipment Breakdown",
    "bulgary": "Theft/Burglary Risk",
    "Employee Related": "Employee/Workforce Risk",
    "marine": "Transit Risk",
    "Industry_All_risk": "Business Interruption",
    "Business Package": "Business Interruption",
}


async def link_categories():
    async with AsyncSessionLocal() as db:
        linked = 0
        skipped = 0
        not_found = []

        for folder_name, risk_cat_name in FOLDER_TO_RISK_CATEGORY.items():
            result = await db.execute(
                select(RiskCategory).where(RiskCategory.name == risk_cat_name)
            )
            risk_cat = result.scalar_one_or_none()
            if not risk_cat:
                logger.warning("RiskCategory '%s' not found — run seed-question.py first", risk_cat_name)
                not_found.append(risk_cat_name)
                continue

            result = await db.execute(
                select(InsuranceCategory).where(InsuranceCategory.name == folder_name)
            )
            ins_cat = result.scalar_one_or_none()
            if not ins_cat:
                logger.warning("InsuranceCategory '%s' not found — run the ingestion pipeline first", folder_name)
                not_found.append(folder_name)
                continue

            if ins_cat.risk_category_id is not None:
                logger.info("Skipping '%s' — already linked to %s", folder_name, risk_cat_name)
                skipped += 1
                continue

            ins_cat.risk_category_id = risk_cat.id
            linked += 1
            logger.info("Linked '%s' → '%s'", folder_name, risk_cat_name)

        await db.commit()

        logger.info("Done: %d linked, %d skipped, %d not found", linked, skipped, len(not_found))
        if not_found:
            logger.warning("Unresolved: %s", not_found)


def main():
    asyncio.run(link_categories())


if __name__ == "__main__":
    main()
