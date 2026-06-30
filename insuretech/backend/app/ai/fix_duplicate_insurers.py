import asyncio
from collections import defaultdict
from sqlalchemy import select, text, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.models import Insurer, Policy, PolicyDocument, DocumentChunk
from app.ai.insurer_normalizer import normalize_insurer_name as canonicalize_insurer


async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db:
        result = await db.execute(select(Insurer))
        all_insurers = result.scalars().all()
        print(f"Found {len(all_insurers)} insurers in DB")

        groups = defaultdict(list)
        for ins in all_insurers:
            canonical = canonicalize_insurer(ins.name)
            groups[canonical].append(ins)

        print(f"After normalization: {len(groups)} unique canonical names\n")

        for canonical, insurers in groups.items():
            if len(insurers) == 1:
                existing = insurers[0]
                if existing.name != canonical:
                    print(f"  Renaming: '{existing.name}' -> '{canonical}'")
                    existing.name = canonical
                    await db.flush()
                continue

            print(f"\n  Merging {len(insurers)} variants for '{canonical}':")
            for ins in insurers:
                print(f"    - {ins.name} (id={ins.id})")

            survivor = None
            for ins in insurers:
                if ins.name == canonical:
                    survivor = ins
                    break
            if not survivor:
                survivor = min(insurers, key=lambda i: len(i.name))

            victims = [ins for ins in insurers if ins.id != survivor.id]

            for victim in victims:
                policy_count = await db.execute(
                    select(text("count(*)")).select_from(Policy).where(Policy.insurer_id == victim.id)
                )
                doc_count = await db.execute(
                    select(text("count(*)")).select_from(PolicyDocument).where(PolicyDocument.insurer_id == victim.id)
                )
                chunk_count = await db.execute(
                    select(text("count(*)")).select_from(DocumentChunk)
                    .where(DocumentChunk.document_id.in_(
                        select(PolicyDocument.id).where(PolicyDocument.insurer_id == victim.id)
                    ))
                )
                p = policy_count.scalar() or 0
                d = doc_count.scalar() or 0
                c = chunk_count.scalar() or 0
                print(f"    -> Repointing {p} policies, {d} documents, {c} chunks from victim '{victim.name}'")

                await db.execute(
                    Policy.__table__.update().where(Policy.insurer_id == victim.id).values(insurer_id=survivor.id)
                )
                await db.execute(
                    PolicyDocument.__table__.update().where(PolicyDocument.insurer_id == victim.id).values(insurer_id=survivor.id)
                )

                await db.delete(victim)
                print(f"    -> Deleted victim '{victim.name}'")

            if survivor.name != canonical:
                print(f"    -> Renaming survivor: '{survivor.name}' -> '{canonical}'")
                survivor.name = canonical

        await db.flush()

        print("\n\nUpdating document_metadata JSONB with canonical insurer names...")
        all_chunks = await db.execute(select(DocumentChunk))
        chunks = all_chunks.scalars().all()
        updated = 0
        for chunk in chunks:
            if chunk.document_metadata:
                old_insurer = chunk.document_metadata.get("insurer", "")
                new_insurer = canonicalize_insurer(old_insurer)
                if new_insurer != old_insurer:
                    meta = dict(chunk.document_metadata)
                    meta["insurer"] = new_insurer
                    chunk.document_metadata = meta
                    updated += 1
        print(f"  Updated {updated} chunks (out of {len(chunks)} total)")

        await db.commit()

    await engine.dispose()
    print("\nDone. Duplicate insurers merged, JSONB metadata updated.")


if __name__ == "__main__":
    asyncio.run(main())
