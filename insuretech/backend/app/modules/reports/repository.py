from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import BusinessProfile, ProfilingSession, Report
from app.modules.reports.constants import REPORT_STATUS_COMPLETED, REPORT_STATUS_PROCESSING
from app.shared import base_repository as Base


async def commit(db: AsyncSession) -> None:
    """Commit the current transaction on the session."""
    await Base.commit(db)


async def get_session_with_business(
    db: AsyncSession,
    session_id: UUID,
) -> ProfilingSession | None:
    result = await db.execute(
        select(ProfilingSession)
        .where(ProfilingSession.id == session_id)
        .options(
            selectinload(ProfilingSession.business_profile).selectinload(
                BusinessProfile.industry
            ),
            selectinload(ProfilingSession.business_profile).selectinload(
                BusinessProfile.segment
            ),
        )
    )
    return result.scalar_one_or_none()


async def create_completed_report(
    db: AsyncSession,
    business_id: UUID,
    session_id: UUID,
    report_type: str,
) -> Report:
    return await Base.create(
        db,
        Report,
        business_id=business_id,
        session_id=session_id,
        report_type=report_type,
        status=REPORT_STATUS_PROCESSING,
        generated_at=datetime.now(timezone.utc),
    )


async def complete_report(
    db: AsyncSession,
    report: Report,
    file_url: str,
) -> Report:
    report.file_url = file_url
    report.status = REPORT_STATUS_COMPLETED
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
