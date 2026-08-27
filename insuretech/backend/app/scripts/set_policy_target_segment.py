"""Set target_segment = 'both' on all policies that have NULL target_segment.

After the ingestion pipeline creates Policy records, they lack a target_segment
value. This script sets all to 'both' so they match both Industrial and Retail
businesses in the recommendation engine.

Usage:
    cd backend
    source .venv/bin/activate
    python -m app.scripts.set_policy_target_segment
"""

import asyncio
import logging

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models import Policy

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def set_target_segment():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Policy).where(Policy.target_segment.is_(None))
        )
        null_policies = result.scalars().all()

        if not null_policies:
            logger.info("No policies with NULL target_segment — nothing to do")
            return

        for policy in null_policies:
            policy.target_segment = "both"

        await db.commit()
        logger.info("Set target_segment='both' on %d policies", len(null_policies))


def main():
    asyncio.run(set_target_segment())


if __name__ == "__main__":
    main()
