from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import NotFoundException, BadRequestException
from app.core.cloudinary_helper import upload_pdf
from app.core.logging import get_logger
from app.modules.policies import repository as Repo
from app.modules.policies.schemas import (
    InsurerCreate, InsurerUpdate,
    InsuranceCategoryCreate, InsuranceCategoryUpdate,
    PolicyCreate, PolicyUpdate,
    InsurerResponse, InsuranceCategoryResponse,
    PolicyDetailResponse, PolicyListResponse, PaginatedPolicyResponse,
    PolicyDocumentResponse, PolicyUploadResponse,
)
from app.ai.single_pdf_ingestion import ingest_single_pdf
from app.shared.response import APIResponse

logger = get_logger(__name__)


class PoliciesService:

    async def list_insurers(self, db: AsyncSession) -> APIResponse:
        insurers = await Repo.get_insurers(db)
        data = [
            InsurerResponse(
                id=str(i.id), name=i.name,
                irdai_registration_no=i.irdai_registration_no,
                website=i.website, logo_url=i.logo_url,
                is_active=i.is_active,
            )
            for i in insurers
        ]
        return APIResponse.success_response(message="Insurers retrieved", data=[d.model_dump() for d in data])

    async def create_insurer(self, db: AsyncSession, body: InsurerCreate) -> APIResponse:
        insurer = await Repo.create_insurer(db, body.model_dump(exclude_none=True))
        data = InsurerResponse(
            id=str(insurer.id), name=insurer.name,
            irdai_registration_no=insurer.irdai_registration_no,
            website=insurer.website, logo_url=insurer.logo_url,
            is_active=insurer.is_active,
        )
        return APIResponse.success_response(message="Insurer created", data=data.model_dump())

    async def update_insurer(self, db: AsyncSession, insurer_id: str, body: InsurerUpdate) -> APIResponse:
        existing = await Repo.get_insurer_by_id(db, insurer_id)
        if not existing:
            raise NotFoundException("Insurer not found")
        data = {k: v for k, v in body.model_dump(exclude_none=True).items()}
        if not data:
            raise BadRequestException("No fields to update")
        insurer = await Repo.update_insurer(db, insurer_id, data)
        result = InsurerResponse(
            id=str(insurer.id), name=insurer.name,
            irdai_registration_no=insurer.irdai_registration_no,
            website=insurer.website, logo_url=insurer.logo_url,
            is_active=insurer.is_active,
        )
        return APIResponse.success_response(message="Insurer updated", data=result.model_dump())

    async def delete_insurer(self, db: AsyncSession, insurer_id: str) -> APIResponse:
        existing = await Repo.get_insurer_by_id(db, insurer_id)
        if not existing:
            raise NotFoundException("Insurer not found")
        await Repo.soft_delete_insurer(db, insurer_id)
        return APIResponse.success_response(message="Insurer deleted")

    async def list_categories(self, db: AsyncSession) -> APIResponse:
        cats = await Repo.get_categories(db)
        data = [
            InsuranceCategoryResponse(
                id=str(c.id), name=c.name,
                description=c.description,
                risk_category_id=str(c.risk_category_id) if c.risk_category_id else None,
                is_active=c.is_active,
            )
            for c in cats
        ]
        return APIResponse.success_response(message="Categories retrieved", data=[d.model_dump() for d in data])

    async def create_category(self, db: AsyncSession, body: InsuranceCategoryCreate) -> APIResponse:
        cat = await Repo.create_category(db, body.model_dump(exclude_none=True))
        data = InsuranceCategoryResponse(
            id=str(cat.id), name=cat.name,
            description=cat.description,
            risk_category_id=str(cat.risk_category_id) if cat.risk_category_id else None,
            is_active=cat.is_active,
        )
        return APIResponse.success_response(message="Category created", data=data.model_dump())

    async def update_category(self, db: AsyncSession, category_id: str, body: InsuranceCategoryUpdate) -> APIResponse:
        existing = await Repo.get_category_by_id(db, category_id)
        if not existing:
            raise NotFoundException("Category not found")
        data = {k: v for k, v in body.model_dump(exclude_none=True).items()}
        if not data:
            raise BadRequestException("No fields to update")
        cat = await Repo.update_category(db, category_id, data)
        result = InsuranceCategoryResponse(
            id=str(cat.id), name=cat.name,
            description=cat.description,
            risk_category_id=str(cat.risk_category_id) if cat.risk_category_id else None,
            is_active=cat.is_active,
        )
        return APIResponse.success_response(message="Category updated", data=result.model_dump())

    async def delete_category(self, db: AsyncSession, category_id: str) -> APIResponse:
        existing = await Repo.get_category_by_id(db, category_id)
        if not existing:
            raise NotFoundException("Category not found")
        await Repo.soft_delete_category(db, category_id)
        return APIResponse.success_response(message="Category deleted")

    async def list_policies(
        self, db: AsyncSession, page: int = 1, limit: int = 10,
        insurer_id: str | None = None, category_id: str | None = None,
        search: str | None = None,
    ) -> APIResponse:
        policies, total = await Repo.get_policies(db, page, limit, insurer_id, category_id, search)
        items = [
            PolicyListResponse(
                id=str(p.id),
                insurer_id=str(p.insurer_id),
                insurance_category_id=str(p.insurance_category_id),
                policy_name=p.policy_name,
                policy_number=p.policy_number,
                is_active=p.is_active,
            )
            for p in policies
        ]
        data = PaginatedPolicyResponse(
            items=[i.model_dump() for i in items], total=total, page=page, limit=limit
        )
        return APIResponse.success_response(message="Policies retrieved", data=data.model_dump())

    async def get_policy(self, db: AsyncSession, policy_id: str) -> APIResponse:
        policy = await Repo.get_policy_by_id(db, policy_id)
        if not policy:
            raise NotFoundException("Policy not found")
        docs = [
            PolicyDocumentResponse(
                id=str(d.id), doc_type=d.doc_type,
                file_name=d.file_name, file_url=d.file_url,
                file_size=d.file_size, version=d.version,
                is_active=d.is_active, created_at=d.created_at,
            )
            for d in (policy.documents or [])
        ]
        data = PolicyDetailResponse(
            id=str(policy.id),
            insurer_id=str(policy.insurer_id),
            insurance_category_id=str(policy.insurance_category_id),
            policy_name=policy.policy_name,
            policy_number=policy.policy_number,
            min_sum_insured=policy.min_sum_insured,
            max_sum_insured=policy.max_sum_insured,
            key_features=policy.key_features,
            target_segment=policy.target_segment,
            is_active=policy.is_active,
            documents=[d.model_dump() for d in docs],
        )
        return APIResponse.success_response(message="Policy retrieved", data=data.model_dump())

    async def create_policy(self, db: AsyncSession, body: PolicyCreate) -> APIResponse:
        insurer = await Repo.get_insurer_by_id(db, body.insurer_id)
        if not insurer:
            raise NotFoundException("Insurer not found")
        cat = await Repo.get_category_by_id(db, body.insurance_category_id)
        if not cat:
            raise NotFoundException("Insurance category not found")
        policy = await Repo.create_policy(db, body.model_dump())
        data = PolicyDetailResponse(
            id=str(policy.id),
            insurer_id=str(policy.insurer_id),
            insurance_category_id=str(policy.insurance_category_id),
            policy_name=policy.policy_name,
            policy_number=policy.policy_number,
            min_sum_insured=policy.min_sum_insured,
            max_sum_insured=policy.max_sum_insured,
            key_features=policy.key_features,
            target_segment=policy.target_segment,
            is_active=policy.is_active,
        )
        return APIResponse.success_response(message="Policy created", data=data.model_dump())

    async def update_policy(self, db: AsyncSession, policy_id: str, body: PolicyUpdate) -> APIResponse:
        existing = await Repo.get_policy_by_id(db, policy_id)
        if not existing:
            raise NotFoundException("Policy not found")
        data = {k: v for k, v in body.model_dump(exclude_none=True).items()}
        if not data:
            raise BadRequestException("No fields to update")
        if "insurer_id" in data:
            insurer = await Repo.get_insurer_by_id(db, data["insurer_id"])
            if not insurer:
                raise NotFoundException("Insurer not found")
        if "insurance_category_id" in data:
            cat = await Repo.get_category_by_id(db, data["insurance_category_id"])
            if not cat:
                raise NotFoundException("Insurance category not found")
        policy = await Repo.update_policy(db, policy_id, data)
        result = PolicyDetailResponse(
            id=str(policy.id),
            insurer_id=str(policy.insurer_id),
            insurance_category_id=str(policy.insurance_category_id),
            policy_name=policy.policy_name,
            policy_number=policy.policy_number,
            min_sum_insured=policy.min_sum_insured,
            max_sum_insured=policy.max_sum_insured,
            key_features=policy.key_features,
            target_segment=policy.target_segment,
            is_active=policy.is_active,
        )
        return APIResponse.success_response(message="Policy updated", data=result.model_dump())

    async def delete_policy(self, db: AsyncSession, policy_id: str) -> APIResponse:
        existing = await Repo.get_policy_by_id(db, policy_id)
        if not existing:
            raise NotFoundException("Policy not found")
        await Repo.soft_delete_policy(db, policy_id)
        return APIResponse.success_response(message="Policy deleted")

    async def upload_policy_pdf(self, db: AsyncSession, policy_id: str, file_bytes: bytes, file_name: str) -> APIResponse:
        policy = await Repo.get_policy_by_id(db, policy_id)
        if not policy:
            raise NotFoundException("Policy not found")

        file_url = ""
        try:
            public_id = Path(file_name).stem
            cloud_url = await upload_pdf(file_bytes, public_id)
            if cloud_url:
                file_url = cloud_url
        except Exception as e:
            logger.warning(f"Cloudinary upload failed, proceeding with local storage: {e}")

        doc_id, chunks_count = await ingest_single_pdf(
            db=db,
            pdf_bytes=file_bytes,
            file_name=file_name,
            policy_id=policy_id,
            policy_name=policy.policy_name,
            insurer_name=policy.insurer.name if policy.insurer else "",
            insurance_category=policy.insurance_category.name if policy.insurance_category else "",
            insurer_id=str(policy.insurer_id),
        )

        if file_url:
            from sqlalchemy import update
            from app.models import PolicyDocument
            await db.execute(
                update(PolicyDocument)
                .where(PolicyDocument.id == doc_id)
                .values(file_url=file_url)
            )
            await db.flush()

        await db.commit()

        data = PolicyUploadResponse(
            document_id=doc_id,
            file_name=file_name,
            file_url=file_url,
            chunks_count=chunks_count,
        )
        return APIResponse.success_response(message="PDF uploaded and ingested", data=data.model_dump())


Service = PoliciesService()
