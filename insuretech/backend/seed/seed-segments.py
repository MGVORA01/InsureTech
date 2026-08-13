import asyncio

from sqlalchemy import delete, select

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


async def seed_segments_and_industries():
  async with AsyncSessionLocal() as db:
    # Clear existing data first (industries cascade-delete with segments)
    await db.execute(delete(Industry))
    await db.execute(delete(Segment))
    await db.flush()

    for seg_name, seg_data in SEGMENTS.items():
      result = await db.execute(select(Segment).where(Segment.name == seg_name))
      segment = result.scalar_one_or_none()

      if not segment:
        segment = Segment(name=seg_name, description=seg_data["description"])
        db.add(segment)
        await db.flush()

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

    await db.commit()
    print("Segments and industries seeded successfully")


if __name__ == "__main__":
  asyncio.run(seed_segments_and_industries())
