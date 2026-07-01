"""Business logic for the policies module."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.core.logging import get_logger
from app.modules.policies import repository
from app.modules.policies.schemas import (
    PaginatedPolicyListOut,
    PolicyDetailOut,
    PolicyDocumentOut,
    PolicyListItemOut,
)
from app.shared.response import APIResponse

logger = get_logger(__name__)


class _PolicyService:

    async def list_policies(
        self,
        db: AsyncSession,
        page: int = 1,
        limit: int = 10,
        insurance_category_id: UUID | None = None,
    ) -> APIResponse:
        policies, total = await repository.get_policies_paginated(
            db, page=page, limit=limit,
            insurance_category_id=insurance_category_id,
        )
        items = [
            PolicyListItemOut(
                id=p.id,
                policy_name=p.policy_name,
                insurer_name=p.insurer.name if p.insurer else "Unknown",
                insurer_logo_url=p.insurer.logo_url if p.insurer else None,
                insurance_category_name=p.insurance_category.name if p.insurance_category else "Unknown",
            )
            for p in policies
        ]
        return APIResponse.success_response(
            "Policies fetched successfully",
            PaginatedPolicyListOut(
                policies=items, total=total, page=page, limit=limit,
            ).model_dump(),
        )

    async def get_policy_detail(
        self,
        policy_id: UUID,
        db: AsyncSession,
    ) -> APIResponse:
        policy = await repository.get_policy_by_id(db, policy_id)
        if not policy:
            raise NotFoundException("Policy not found")

        documents = await repository.get_policy_documents(db, policy_id)
        doc_out = [
            PolicyDocumentOut(
                id=d.id,
                file_name=d.file_name,
                file_url=d.file_url,
                doc_type=d.doc_type,
                version=d.version,
            )
            for d in documents
        ]

        return APIResponse.success_response(
            "Policy detail fetched successfully",
            PolicyDetailOut(
                id=policy.id,
                policy_name=policy.policy_name,
                insurer_name=policy.insurer.name if policy.insurer else "Unknown",
                insurer_logo_url=policy.insurer.logo_url if policy.insurer else None,
                insurance_category_name=policy.insurance_category.name if policy.insurance_category else "Unknown",
                key_features=policy.key_features,
                min_sum_insured=float(policy.min_sum_insured) if policy.min_sum_insured else None,
                max_sum_insured=float(policy.max_sum_insured) if policy.max_sum_insured else None,
                target_segment=policy.target_segment,
                documents=doc_out,
            ).model_dump(),
        )


Service = _PolicyService()
