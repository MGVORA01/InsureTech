from pydantic import BaseModel
from typing import Optional


class ChatRequest(BaseModel):
    question: str
    session_id: Optional[str] = None
    history: list[dict] = []


class ChatResponse(BaseModel):
    answer: str
    session_id: str
    sources: list[str]


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    chunks_count: int
