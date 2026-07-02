from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import BusinessProfile, ProfilingSession, Report


async def get_session_with_business(
    db: AsyncSession,
    session_id: UUID,
) -> ProfilingSession | None:
    result = await db.execute(
        select(ProfilingSession)
        .where(ProfilingSession.id == session_id)
        .options(
            selectinload(ProfilingSession.business_profile).selectinload(BusinessProfile.industry),
            selectinload(ProfilingSession.business_profile).selectinload(BusinessProfile.segment),
        )
    )
    return result.scalar_one_or_none()


async def create_completed_report(
    db: AsyncSession,
    business_id: UUID,
    session_id: UUID,
    report_type: str,
) -> Report:
    report = Report(
        business_id=business_id,
        session_id=session_id,
        report_type=report_type,
        status="completed",
        generated_at=datetime.now(timezone.utc),
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)
    return report


async def update_report_file_url(
    db: AsyncSession,
    report: Report,
    file_url: str,
) -> Report:
    report.file_url = file_url
    db.add(report)
    await db.flush()
    await db.refresh(report)
    return report


async def get_report_with_business(
    db: AsyncSession,
    report_id: UUID,
) -> Report | None:
    result = await db.execute(
        select(Report)
        .where(Report.id == report_id)
        .options(
            selectinload(Report.business_profile),
            selectinload(Report.session),
        )
    )
    return result.scalar_one_or_none()
