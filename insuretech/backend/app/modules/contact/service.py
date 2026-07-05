from fastapi import Request

from app.core.exceptions import TooManyRequestsException
from app.modules.contact import repository as Repository
from app.modules.contact.constants import (
    CONTACT_SUBMITTED_MESSAGE,
    TOO_MANY_REQUESTS_MESSAGE,
    UNKNOWN_CLIENT_IP,
)
from app.modules.contact.schemas import ContactRequest
from app.shared.response import APIResponse


class ContactService:
    """Service for contact form workflows."""

    async def submit_contact(
        self,
        data: ContactRequest,
        request: Request,
    ) -> APIResponse[None]:
        """Submit a contact form email."""
        client_ip = request.client.host if request.client else UNKNOWN_CLIENT_IP

        if Repository.is_rate_limited(client_ip):
            raise TooManyRequestsException(TOO_MANY_REQUESTS_MESSAGE)

        Repository.record_hit(client_ip)

        await Repository.send_contact(
            name=data.name,
            email=data.email,
            message=data.message,
        )

        return APIResponse.success_response(
            message=CONTACT_SUBMITTED_MESSAGE,
            data=None,
        )


Service = ContactService()
