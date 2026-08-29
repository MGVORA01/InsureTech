"""Service for admin workflows."""

import asyncio
import os
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.modules.admin import repository as Repository
from app.modules.admin.constants import (
    CREATED_AT_FIELD,
    DASHBOARD_STATS_FETCHED_MESSAGE,
    DEFAULT_ROLE_NAME,
    DOCUMENT_DELETED_MESSAGE_TEMPLATE,
    DOCUMENT_NOT_FOUND_MESSAGE,
    DOCUMENTS_FETCHED_MESSAGE,
    FEEDBACKS_FETCHED_MESSAGE,
    LIMIT_KEY,
    PAGE_KEY,
    PDFS_DIR,
    TOTAL_KEY,
    UPDATED_AT_FIELD,
    USER_NOT_FOUND_MESSAGE,
    USER_STATUS_UPDATED_MESSAGE,
    USERS_FETCHED_MESSAGE,
    USERS_KEY,
)
from app.modules.admin.schemas import AdminFeedbackItem, KnowledgeDocumentItem, UserListItem
from app.modules.chat.service import Service as ChatService
from app.shared.response import APIResponse


class AdminService:
    def __init__(self, chat_service=None):
        self._chat_service = chat_service or ChatService

    async def get_dashboard_stats_service(
        self,
        db: AsyncSession,
    ) -> APIResponse[dict[str, Any]]:
        """Fetch dashboard statistics for admin users."""
        stats = await Repository.get_user_stats(db)
        return APIResponse.success_response(
            message=DASHBOARD_STATS_FETCHED_MESSAGE,
            data=stats,
        )

    async def get_all_users_service(
        self,
        db: AsyncSession,
        page: int,
        limit: int,
        is_active: bool | None = None,
    ) -> APIResponse[dict[str, Any]]:
        """Fetch users for the admin list view."""
        result = await Repository.get_all_users(db, page, limit, is_active)
        users = [self._user_to_list_item(user) for user in result[USERS_KEY]]
        return APIResponse.success_response(
            message=USERS_FETCHED_MESSAGE,
            data={
                USERS_KEY: users,
                TOTAL_KEY: result[TOTAL_KEY],
                PAGE_KEY: result[PAGE_KEY],
                LIMIT_KEY: result[LIMIT_KEY],
            },
        )

    async def get_feedback_responses_service(
        self,
        db: AsyncSession,
        page: int,
        limit: int,
        search: str | None = None,
        sort_order: str = "desc",
    ) -> APIResponse[dict[str, object]]:
        """Fetch feedback responses for the admin list view."""
        result = await Repository.get_feedback_responses(
            db,
            page=page,
            limit=limit,
            search=search,
            sort_order=sort_order,
        )

        feedbacks = [
            AdminFeedbackItem(
                id=item.id,
                userName=item.user.full_name,
                userEmail=item.user.email,
                response=item.message,
                rating=item.rating,
                recommendationsHelpful=item.recommendations_helpful,
                submittedAt=item.created_at.isoformat() if item.created_at else "",
            ).model_dump()
            for item in result["feedbacks"]
        ]

        return APIResponse.success_response(
            message=FEEDBACKS_FETCHED_MESSAGE,
            data={
                "feedbacks": feedbacks,
                TOTAL_KEY: result[TOTAL_KEY],
                PAGE_KEY: result[PAGE_KEY],
                LIMIT_KEY: result[LIMIT_KEY],
            },
        )

    async def upload_pdf_service(
        self,
        file_path: str,
        db: AsyncSession,
    ) -> APIResponse:
        """Upload an existing PDF path into the knowledge base."""
        return await self._chat_service.process_pdf_upload(file_path, db)

    async def upload_pdf_file_service(
        self,
        file_path: str,
        db: AsyncSession,
    ) -> APIResponse:
        """Ingest a PDF file already persisted by the router."""
        return await self._chat_service.process_pdf_upload(file_path, db)

    async def update_user_status_service(
        self,
        db: AsyncSession,
        user_id: str,
        is_active: bool,
    ) -> APIResponse[dict[str, Any]]:
        """Update a user's active status."""
        user = await Repository.update_user_status(db, UUID(user_id), is_active)
        if not user:
            raise NotFoundException(USER_NOT_FOUND_MESSAGE)
        await Repository.commit(db)
        return APIResponse.success_response(
            message=USER_STATUS_UPDATED_MESSAGE,
            data=self._user_to_list_item(user),
        )

    async def list_knowledge_documents_service(
        self,
        db: AsyncSession,
    ) -> APIResponse[list[KnowledgeDocumentItem]]:
        """List knowledge-base PDF documents."""
        rows = await Repository.get_knowledge_documents(db)
        documents = [
            KnowledgeDocumentItem(
                id=row.id,
                file_name=row.file_name,
                file_size=row.file_size,
                chunks_count=row.chunks_count,
                created_at=row.created_at.isoformat() if row.created_at else "",
            )
            for row in rows
        ]
        return APIResponse.success_response(
            message=DOCUMENTS_FETCHED_MESSAGE,
            data=documents,
        )

    async def delete_knowledge_document_service(
        self,
        db: AsyncSession,
        document_id: str,
    ) -> APIResponse[None]:
        """Delete a knowledge-base PDF document."""
        doc = await Repository.delete_knowledge_document(db, UUID(document_id))
        if not doc:
            raise NotFoundException(DOCUMENT_NOT_FOUND_MESSAGE)
        await Repository.commit(db)

        file_path = os.path.join(PDFS_DIR, doc.file_name)
        try:
            await asyncio.to_thread(os.remove, file_path)
        except OSError:
            pass

        return APIResponse.success_response(
            message=DOCUMENT_DELETED_MESSAGE_TEMPLATE.format(file_name=doc.file_name),
            data=None,
        )

    @staticmethod
    def _user_to_list_item(user: Any) -> dict[str, Any]:
        """Serialize a user ORM object for admin list responses."""
        return UserListItem(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            role=user.role.name if user.role else DEFAULT_ROLE_NAME,
            is_active=user.is_active,
            created_at=user.created_at.isoformat()
            if hasattr(user, CREATED_AT_FIELD) and user.created_at
            else None,
            updated_at=user.updated_at.isoformat()
            if hasattr(user, UPDATED_AT_FIELD) and user.updated_at
            else None,
        ).model_dump()


Service = AdminService()
