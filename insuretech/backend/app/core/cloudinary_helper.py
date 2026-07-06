import asyncio

import cloudinary
import cloudinary.uploader
from app.core.config import settings


def init_cloudinary():
    if settings.CLOUDINARY_CLOUD_NAME:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )
        return True
    return False


async def upload_pdf(file_bytes: bytes, public_id: str) -> str | None:
    if not init_cloudinary():
        return None
    result = await asyncio.to_thread(
        cloudinary.uploader.upload,
        file_bytes,
        public_id=public_id,
        resource_type="raw",
        format="pdf",
        folder="policy_documents",
    )
    return result.get("secure_url")
