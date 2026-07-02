from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.database import get_db
from app.models import User
from app.modules.reports.service import Service
from app.shared.dependency.get_current_user import get_current_user
from app.shared.response import APIResponse

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
)


@router.post("/{session_id}/risk-advisory", status_code=status.HTTP_200_OK)
async def generate_risk_advisory_report(
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse:
    return await Service.generate_risk_advisory_report(session_id, current_user, db)


@router.get("/{report_id}/download", status_code=status.HTTP_200_OK)
async def download_risk_advisory_report(
    report_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    file_path, filename = await Service.get_report_download_path(report_id, current_user, db)
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/pdf",
    )
