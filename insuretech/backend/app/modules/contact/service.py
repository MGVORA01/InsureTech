from fastapi import HTTPException, Request
from starlette import status

from app.modules.contact import repository as Repository
from app.modules.contact.schemas import ContactRequest


class ContactService:

    async def submit_contact(self, data: ContactRequest, request: Request):
        client_ip = request.client.host if request.client else "unknown"

        if Repository.is_rate_limited(client_ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again in 15 minutes.",
            )

        Repository.record_hit(client_ip)

        await Repository.send_contact(
            name=data.name,
            email=data.email,
            message=data.message,
        )

        return {"detail": "Message sent successfully."}


Service = ContactService()
