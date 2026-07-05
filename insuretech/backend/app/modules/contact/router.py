"""Route definitions for contact workflows."""

from fastapi import APIRouter, Request
from starlette import status

from app.modules.contact.constants import (
    CONTACT_PREFIX,
    CONTACT_SUBMIT_ROUTE,
    CONTACT_TAG,
)
from app.modules.contact.schemas import ContactRequest
from app.modules.contact.service import Service
from app.shared.response import APIResponse

router = APIRouter(
    prefix=CONTACT_PREFIX,
    tags=[CONTACT_TAG],
)


@router.post(CONTACT_SUBMIT_ROUTE, status_code=status.HTTP_200_OK)
async def submit_contact(data: ContactRequest, request: Request) -> APIResponse:
    """Submit a contact form."""
    return await Service.submit_contact(data, request)
