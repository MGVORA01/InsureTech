from collections import defaultdict
from datetime import datetime

from app.core.mail import send_contact_email
from app.core.exceptions import TooManyRequestsException
from app.modules.contact.constants import (
    CONTACT_SUBMITTED_MESSAGE,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW,
    TOO_MANY_REQUESTS_MESSAGE,
)
from app.modules.contact.schemas import ContactRequest
from app.shared.response import APIResponse

rate_store: dict[str, list[datetime]] = defaultdict(list)


class ContactService:
    """Service for contact form workflows."""

    async def submit_contact(
        self,
        data: ContactRequest,
        client_ip: str,
    ) -> APIResponse[None]:
        """Submit a contact form email."""
        if self._is_rate_limited(client_ip):
            raise TooManyRequestsException(TOO_MANY_REQUESTS_MESSAGE)

        self._record_hit(client_ip)

        await send_contact_email(
            name=data.name,
            email=data.email,
            message=data.message,
        )

        return APIResponse.success_response(
            message=CONTACT_SUBMITTED_MESSAGE,
            data=None,
        )

    @staticmethod
    def _is_rate_limited(ip: str) -> bool:
        now = datetime.utcnow()
        cutoff = now - RATE_LIMIT_WINDOW
        timestamps = [t for t in rate_store[ip] if t > cutoff]
        rate_store[ip] = timestamps
        return len(timestamps) >= RATE_LIMIT_MAX

    @staticmethod
    def _record_hit(ip: str) -> None:
        rate_store[ip].append(datetime.utcnow())


Service = ContactService()
