import os
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.modules.admin import repository as Repository
from app.modules.admin.schemas import KnowledgeDocumentItem, UserListItem
from app.modules.chat.schemas import UploadResponse
from app.modules.chat.service import process_pdf_upload
from app.shared.response import APIResponse

PDFS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chat", "pdfs")


async def get_dashboard_stats_service(db):
    stats = await Repository.get_user_stats(db)
    return APIResponse.success_response(
        message="Dashboard stats fetched successfully",
        data=stats,
    )


def _user_to_list_item(user) -> dict:
    return UserListItem(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role.name if user.role else "USER",
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if hasattr(user, "created_at") and user.created_at else None,
        updated_at=user.updated_at.isoformat() if hasattr(user, "updated_at") and user.updated_at else None,
    ).model_dump()


async def get_all_users_service(db, page: int, limit: int, is_active: bool | None = None):
    result = await Repository.get_all_users(db, page, limit, is_active)
    users = [_user_to_list_item(u) for u in result["users"]]
    return APIResponse.success_response(
        message="Users fetched successfully",
        data={
            "users": users,
            "total": result["total"],
            "page": result["page"],
            "limit": result["limit"],
        },
    )


async def upload_pdf_service(file_path: str, db: AsyncSession) -> APIResponse:
    return await process_pdf_upload(file_path, db)


async def upload_pdf_file_service(file: UploadFile, db: AsyncSession) -> APIResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise BadRequestException("Only PDF files are allowed")

    os.makedirs(PDFS_DIR, exist_ok=True)
    file_path = os.path.join(PDFS_DIR, file.filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    return await process_pdf_upload(file_path, db)


async def update_user_status_service(db, user_id: str, is_active: bool):
    user = await Repository.update_user_status(db, UUID(user_id), is_active)
    if not user:
        raise NotFoundException("User not found")
    return APIResponse.success_response(
        message="User status updated successfully",
        data=_user_to_list_item(user),
    )


async def list_knowledge_documents_service(db):
    rows = await Repository.get_knowledge_documents(db)
    documents = [
        KnowledgeDocumentItem(
            id=str(row.id),
            file_name=row.file_name,
            file_size=row.file_size,
            chunks_count=row.chunks_count,
            created_at=row.created_at.isoformat() if row.created_at else "",
        )
        for row in rows
    ]
    return APIResponse.success_response(
        message="Documents fetched successfully",
        data=documents,
    )


async def delete_knowledge_document_service(db, document_id: str):
    doc = await Repository.delete_knowledge_document(db, UUID(document_id))
    if not doc:
        raise NotFoundException("Document not found")

    file_path = os.path.join(PDFS_DIR, doc.file_name)
    try:
        os.remove(file_path)
    except OSError:
        pass

    return APIResponse.success_response(
        message=f"'{doc.file_name}' deleted successfully",
        data=None,
    )
