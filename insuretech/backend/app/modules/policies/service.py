"""Service layer for policy workflows."""

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.single_pdf_ingestion import ingest_single_pdf
from app.core.cloudinary_helper import upload_pdf
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.logging import get_logger
from app.modules.policies import repository as Repo
from app.modules.policies.constants import (
    CATEGORIES_RETRIEVED_MESSAGE,
    CATEGORY_CREATED_MESSAGE,
    CATEGORY_DELETED_MESSAGE,
    CATEGORY_HAS_POLICIES_MESSAGE,
    CATEGORY_NOT_FOUND_MESSAGE,
    CATEGORY_UPDATED_MESSAGE,
    CLOUDINARY_NOT_CONFIGURED_LOG_MESSAGE,
    CLOUDINARY_UPLOAD_FAILED_LOG_MESSAGE,
    EMPTY_FILE_MESSAGE,
    EMPTY_VALUE,
    HTTP_PREFIX,
    INSURANCE_CATEGORY_ID_FIELD,
    INSURANCE_CATEGORY_NOT_FOUND_MESSAGE,
    INSURER_CREATED_MESSAGE,
    INSURER_DELETED_MESSAGE,
    INSURER_HAS_POLICIES_MESSAGE,
    INSURER_ID_FIELD,
    INSURER_NOT_FOUND_MESSAGE,
    INSURER_UPDATED_MESSAGE,
    INSURERS_RETRIEVED_MESSAGE,
    LOCAL_FILE_URL_TEMPLATE,
    NO_FIELDS_TO_UPDATE_MESSAGE,
    PDF_EXTENSION,
    PDF_ONLY_MESSAGE,
    POLICIES_RETRIEVED_MESSAGE,
    POLICY_CREATED_MESSAGE,
    POLICY_DELETED_MESSAGE,
    POLICY_NOT_FOUND_MESSAGE,
    POLICY_PDF_UPLOADED_MESSAGE,
    POLICY_RETRIEVED_MESSAGE,
    POLICY_UPDATED_MESSAGE,
)
from app.modules.policies.schemas import (
    InsuranceCategoryCreate,
    InsuranceCategoryUpdate,
    InsuranceCategoryResponse,
    InsurerCreate,
    InsurerResponse,
    InsurerUpdate,
    PaginatedPolicyResponse,
    PolicyCreate,
    PolicyDetailResponse,
    PolicyDocumentResponse,
    PolicyListResponse,
    PolicyUpdate,
    PolicyUploadResponse,
)
from app.shared.response import APIResponse

logger = get_logger(__name__)


class PoliciesService:
    """Service for policy, insurer, category, and document workflows."""

    async def list_insurers(self, db: AsyncSession) -> APIResponse:
        """List active insurers."""
        insurers = await Repo.get_insurers(db)
        data = [
            InsurerResponse(
                id=str(i.id),
                name=i.name,
                irdai_registration_no=i.irdai_registration_no,
                website=i.website,
                logo_url=i.logo_url,
                is_active=i.is_active,
            )
            for i in insurers
        ]
        return APIResponse.success_response(
            message=INSURERS_RETRIEVED_MESSAGE,
            data=[d.model_dump() for d in data],
        )

    async def create_insurer(
        self, db: AsyncSession, body: InsurerCreate
    ) -> APIResponse:
        """Create an insurer."""
        insurer = await Repo.create_insurer(db, body.model_dump(exclude_none=True))
        data = InsurerResponse(
            id=str(insurer.id),
            name=insurer.name,
            irdai_registration_no=insurer.irdai_registration_no,
            website=insurer.website,
            logo_url=insurer.logo_url,
            is_active=insurer.is_active,
        )
        return APIResponse.success_response(
            message=INSURER_CREATED_MESSAGE,
            data=data.model_dump(),
        )

    async def update_insurer(
        self, db: AsyncSession, insurer_id: str, body: InsurerUpdate
    ) -> APIResponse:
        """Update an insurer."""
        existing = await Repo.get_insurer_by_id(db, insurer_id)
        if not existing:
            raise NotFoundException(INSURER_NOT_FOUND_MESSAGE)
        data = {k: v for k, v in body.model_dump(exclude_none=True).items()}
        if not data:
            raise BadRequestException(NO_FIELDS_TO_UPDATE_MESSAGE)
        insurer = await Repo.update_insurer(db, insurer_id, data)
        result = InsurerResponse(
            id=str(insurer.id),
            name=insurer.name,
            irdai_registration_no=insurer.irdai_registration_no,
            website=insurer.website,
            logo_url=insurer.logo_url,
            is_active=insurer.is_active,
        )
        return APIResponse.success_response(
            message=INSURER_UPDATED_MESSAGE,
            data=result.model_dump(),
        )

    async def delete_insurer(self, db: AsyncSession, insurer_id: str) -> APIResponse:
        """Soft-delete an insurer."""
        existing = await Repo.get_insurer_by_id(db, insurer_id)
        if not existing:
            raise NotFoundException(INSURER_NOT_FOUND_MESSAGE)
        policy_count = await Repo.get_policy_count_for_insurer(db, insurer_id)
        if policy_count > 0:
            raise BadRequestException(INSURER_HAS_POLICIES_MESSAGE)
        await Repo.soft_delete_insurer(db, insurer_id)
        return APIResponse.success_response(message=INSURER_DELETED_MESSAGE)

    async def list_categories(self, db: AsyncSession) -> APIResponse:
        """List active insurance categories."""
        cats = await Repo.get_categories(db)
        data = [
            InsuranceCategoryResponse(
                id=str(c.id),
                name=c.name,
                description=c.description,
                risk_category_id=str(c.risk_category_id)
                if c.risk_category_id
                else None,
                is_active=c.is_active,
            )
            for c in cats
        ]
        return APIResponse.success_response(
            message=CATEGORIES_RETRIEVED_MESSAGE,
            data=[d.model_dump() for d in data],
        )

    async def create_category(
        self, db: AsyncSession, body: InsuranceCategoryCreate
    ) -> APIResponse:
        """Create an insurance category."""
        cat = await Repo.create_category(db, body.model_dump(exclude_none=True))
        data = InsuranceCategoryResponse(
            id=str(cat.id),
            name=cat.name,
            description=cat.description,
            risk_category_id=str(cat.risk_category_id)
            if cat.risk_category_id
            else None,
            is_active=cat.is_active,
        )
        return APIResponse.success_response(
            message=CATEGORY_CREATED_MESSAGE,
            data=data.model_dump(),
        )

    async def update_category(
        self, db: AsyncSession, category_id: str, body: InsuranceCategoryUpdate
    ) -> APIResponse:
        """Update an insurance category."""
        existing = await Repo.get_category_by_id(db, category_id)
        if not existing:
            raise NotFoundException(CATEGORY_NOT_FOUND_MESSAGE)
        data = {k: v for k, v in body.model_dump(exclude_none=True).items()}
        if not data:
            raise BadRequestException(NO_FIELDS_TO_UPDATE_MESSAGE)
        cat = await Repo.update_category(db, category_id, data)
        result = InsuranceCategoryResponse(
            id=str(cat.id),
            name=cat.name,
            description=cat.description,
            risk_category_id=str(cat.risk_category_id)
            if cat.risk_category_id
            else None,
            is_active=cat.is_active,
        )
        return APIResponse.success_response(
            message=CATEGORY_UPDATED_MESSAGE,
            data=result.model_dump(),
        )

    async def delete_category(self, db: AsyncSession, category_id: str) -> APIResponse:
        """Soft-delete an insurance category."""
        existing = await Repo.get_category_by_id(db, category_id)
        if not existing:
            raise NotFoundException(CATEGORY_NOT_FOUND_MESSAGE)
        policy_count = await Repo.get_policy_count_for_category(db, category_id)
        if policy_count > 0:
            raise BadRequestException(CATEGORY_HAS_POLICIES_MESSAGE)
        await Repo.soft_delete_category(db, category_id)
        return APIResponse.success_response(message=CATEGORY_DELETED_MESSAGE)

    async def list_policies(
        self,
        db: AsyncSession,
        page: int = 1,
        limit: int = 10,
        insurer_id: str | None = None,
        category_id: str | None = None,
        search: str | None = None,
    ) -> APIResponse:
        """List active policies."""
        policies, total = await Repo.get_policies(
            db, page, limit, insurer_id, category_id, search
        )
        items = []
        for p in policies:
            doc_count = await Repo.get_document_count_for_policy(db, str(p.id))
            items.append(
                PolicyListResponse(
                    id=str(p.id),
                    insurer_id=str(p.insurer_id),
                    insurer_name=p.insurer.name if p.insurer else EMPTY_VALUE,
                    insurance_category_id=str(p.insurance_category_id),
                    insurance_category_name=p.insurance_category.name
                    if p.insurance_category
                    else EMPTY_VALUE,
                    policy_name=p.policy_name,
                    policy_number=p.policy_number,
                    is_active=p.is_active,
                    documents_count=doc_count,
                )
            )
        data = PaginatedPolicyResponse(
            items=[i.model_dump() for i in items], total=total, page=page, limit=limit
        )
        return APIResponse.success_response(
            message=POLICIES_RETRIEVED_MESSAGE,
            data=data.model_dump(),
        )

    async def get_policy(self, db: AsyncSession, policy_id: str) -> APIResponse:
        """Fetch a policy detail."""
        policy = await Repo.get_policy_by_id(db, policy_id)
        if not policy:
            raise NotFoundException(POLICY_NOT_FOUND_MESSAGE)
        docs = [
            PolicyDocumentResponse(
                id=str(d.id),
                doc_type=d.doc_type,
                file_name=d.file_name,
                file_url=d.file_url,
                file_size=d.file_size,
                version=d.version,
                is_active=d.is_active,
                created_at=d.created_at,
            )
            for d in (policy.documents or [])
        ]
        data = PolicyDetailResponse(
            id=str(policy.id),
            insurer_id=str(policy.insurer_id),
            insurer_name=policy.insurer.name if policy.insurer else EMPTY_VALUE,
            insurance_category_id=str(policy.insurance_category_id),
            insurance_category_name=policy.insurance_category.name
            if policy.insurance_category
            else EMPTY_VALUE,
            policy_name=policy.policy_name,
            policy_number=policy.policy_number,
            min_sum_insured=policy.min_sum_insured,
            max_sum_insured=policy.max_sum_insured,
            key_features=policy.key_features,
            target_segment=policy.target_segment,
            is_active=policy.is_active,
            documents=[d.model_dump() for d in docs],
        )
        return APIResponse.success_response(
            message=POLICY_RETRIEVED_MESSAGE,
            data=data.model_dump(),
        )

    async def create_policy(self, db: AsyncSession, body: PolicyCreate) -> APIResponse:
        """Create a policy."""
        insurer = await Repo.get_insurer_by_id(db, body.insurer_id)
        if not insurer:
            raise NotFoundException(INSURER_NOT_FOUND_MESSAGE)
        cat = await Repo.get_category_by_id(db, body.insurance_category_id)
        if not cat:
            raise NotFoundException(INSURANCE_CATEGORY_NOT_FOUND_MESSAGE)
        policy = await Repo.create_policy(db, body.model_dump())
        data = PolicyDetailResponse(
            id=str(policy.id),
            insurer_id=str(policy.insurer_id),
            insurer_name=insurer.name,
            insurance_category_id=str(policy.insurance_category_id),
            insurance_category_name=cat.name,
            policy_name=policy.policy_name,
            policy_number=policy.policy_number,
            min_sum_insured=policy.min_sum_insured,
            max_sum_insured=policy.max_sum_insured,
            key_features=policy.key_features,
            target_segment=policy.target_segment,
            is_active=policy.is_active,
        )
        return APIResponse.success_response(
            message=POLICY_CREATED_MESSAGE,
            data=data.model_dump(),
        )

    async def update_policy(
        self, db: AsyncSession, policy_id: str, body: PolicyUpdate
    ) -> APIResponse:
        """Update a policy."""
        existing = await Repo.get_policy_by_id(db, policy_id)
        if not existing:
            raise NotFoundException(POLICY_NOT_FOUND_MESSAGE)
        data = {k: v for k, v in body.model_dump(exclude_none=True).items()}
        if not data:
            raise BadRequestException(NO_FIELDS_TO_UPDATE_MESSAGE)
        if INSURER_ID_FIELD in data:
            insurer = await Repo.get_insurer_by_id(db, data[INSURER_ID_FIELD])
            if not insurer:
                raise NotFoundException(INSURER_NOT_FOUND_MESSAGE)
        if INSURANCE_CATEGORY_ID_FIELD in data:
            cat = await Repo.get_category_by_id(
                db,
                data[INSURANCE_CATEGORY_ID_FIELD],
            )
            if not cat:
                raise NotFoundException(INSURANCE_CATEGORY_NOT_FOUND_MESSAGE)
        policy = await Repo.update_policy(db, policy_id, data)
        # Re-fetch to get loaded relationships
        policy = await Repo.get_policy_by_id(db, policy_id)
        result = PolicyDetailResponse(
            id=str(policy.id),
            insurer_id=str(policy.insurer_id),
            insurer_name=policy.insurer.name if policy.insurer else EMPTY_VALUE,
            insurance_category_id=str(policy.insurance_category_id),
            insurance_category_name=policy.insurance_category.name
            if policy.insurance_category
            else EMPTY_VALUE,
            policy_name=policy.policy_name,
            policy_number=policy.policy_number,
            min_sum_insured=policy.min_sum_insured,
            max_sum_insured=policy.max_sum_insured,
            key_features=policy.key_features,
            target_segment=policy.target_segment,
            is_active=policy.is_active,
        )
        return APIResponse.success_response(
            message=POLICY_UPDATED_MESSAGE,
            data=result.model_dump(),
        )

    async def delete_policy(self, db: AsyncSession, policy_id: str) -> APIResponse:
        """Soft-delete a policy and its active documents."""
        existing = await Repo.get_policy_by_id(db, policy_id)
        if not existing:
            raise NotFoundException(POLICY_NOT_FOUND_MESSAGE)
        await Repo.delete_chunks_for_policy(db, policy_id)
        await Repo.soft_delete_documents_for_policy(db, policy_id)
        await Repo.soft_delete_policy(db, policy_id)
        return APIResponse.success_response(message=POLICY_DELETED_MESSAGE)

    async def upload_policy_pdf(
        self, db: AsyncSession, policy_id: str, file_bytes: bytes, file_name: str
    ) -> APIResponse:
        """Upload and ingest a policy PDF."""
        if not file_name or not file_name.lower().endswith(PDF_EXTENSION):
            raise BadRequestException(PDF_ONLY_MESSAGE)
        if not file_bytes:
            raise BadRequestException(EMPTY_FILE_MESSAGE)

        policy = await Repo.get_policy_for_upload(db, policy_id)
        if not policy:
            raise NotFoundException(POLICY_NOT_FOUND_MESSAGE)

        existing_docs = await Repo.get_active_documents_for_policy(db, policy_id)
        if existing_docs:
            new_version = max(d.version for d in existing_docs) + 1
            for doc in existing_docs:
                await Repo.delete_document_chunks(db, str(doc.id))
        else:
            new_version = 1

        file_url = LOCAL_FILE_URL_TEMPLATE.format(file_name=file_name)
        try:
            public_id = Path(file_name).stem
            cloud_url = await upload_pdf(file_bytes, public_id)
            if cloud_url:
                file_url = cloud_url
            else:
                logger.warning(
                    CLOUDINARY_NOT_CONFIGURED_LOG_MESSAGE,
                    file_name,
                )
        except Exception as exc:
            logger.warning(
                CLOUDINARY_UPLOAD_FAILED_LOG_MESSAGE,
                file_name,
                exc,
            )

        doc_id, chunks_count = await ingest_single_pdf(
            db=db,
            pdf_bytes=file_bytes,
            file_name=file_name,
            policy_id=policy_id,
            policy_name=policy.policy_name,
            insurer_name=policy.insurer.name if policy.insurer else EMPTY_VALUE,
            insurance_category=policy.insurance_category.name
            if policy.insurance_category
            else EMPTY_VALUE,
            insurer_id=str(policy.insurer_id),
            document_version=new_version,
            file_url=file_url,
        )

        if file_url and file_url.startswith(HTTP_PREFIX):
            await Repo.update_document_file_url(db, doc_id, file_url)

        data = PolicyUploadResponse(
            document_id=doc_id,
            file_name=file_name,
            file_url=file_url,
            chunks_count=chunks_count,
        )
        return APIResponse.success_response(
            message=POLICY_PDF_UPLOADED_MESSAGE,
            data=data.model_dump(),
        )


Service = PoliciesService()
