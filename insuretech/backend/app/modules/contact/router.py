from fastapi import APIRouter, Request
from starlette import status

from app.modules.contact.schemas import ContactRequest
from app.modules.contact.service import Service

router = APIRouter(
    prefix="/contact",
    tags=["contact"],
)


@router.post("", status_code=status.HTTP_200_OK)
async def submit_contact(data: ContactRequest, request: Request):
    return await Service.submit_contact(data, request)
