import asyncio
import os
from uuid import uuid4

from groq import Groq
from langchain_text_splitters import RecursiveCharacterTextSplitter
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.chat import repository as Repo
from app.modules.chat.schemas import ChatRequest, ChatResponse, UploadResponse
from app.modules.chat.system_prompt import SYSTEM_PROMPT
from app.shared.response import APIResponse

client = Groq(api_key=settings.GROQ_API_KEY)
_embed_model = None


def _get_embed_model():
    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer("all-mpnet-base-v2")
    return _embed_model


def _embed_text(text: str) -> list[float]:
    return _get_embed_model().encode(text).tolist()


def _call_groq(messages: list[dict]) -> str:
    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        temperature=settings.GROQ_TEMPERATURE,
    )
    return response.choices[0].message.content


async def chat(data: ChatRequest, db: AsyncSession) -> APIResponse:
    session_id = data.session_id or str(uuid4())
    query_vec = _embed_text(data.question)
    chunks = await Repo.search_similar_chunks(db, query_vec, limit=5)

    if not chunks:
        return APIResponse.success_response(
            message="Answer generated",
            data=ChatResponse(
                answer="Sorry, I'm unable to answer this question. Please contact our support team through the website and they'll help you directly.",
                session_id=session_id,
                sources=[],
            ).model_dump(),
        )

    context = "\n\n".join(c[0] for c in chunks)
    system_msg = {"role": "system", "content": SYSTEM_PROMPT.format(context=context)}
    messages = [system_msg, *data.history, {"role": "user", "content": data.question}]
    answer = _call_groq(messages)
    sources = [f"Page {page}: {text[:150]}..." for text, page, _ in chunks]

    return APIResponse.success_response(
        message="Answer generated successfully",
        data=ChatResponse(answer=answer, session_id=session_id, sources=sources).model_dump(),
    )


async def process_pdf_upload(file_path: str, db: AsyncSession) -> APIResponse:
    if not os.path.exists(file_path):
        return APIResponse.error_response(message=f"File not found: {file_path}")

    with open(file_path, "rb") as f:
        reader = PdfReader(f)
        pages = [(i + 1, page.extract_text()) for i, page in enumerate(reader.pages)]

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
    chunks = []
    for page_num, text in pages:
        if not text.strip():
            continue
        page_chunks = await asyncio.to_thread(splitter.split_text, text)
        for chunk_text in page_chunks:
            chunks.append({"chunk_text": chunk_text, "page_number": page_num})

    if not chunks:
        return APIResponse.error_response(message="No text extracted from PDF")

    model = _get_embed_model()
    texts = [c["chunk_text"] for c in chunks]
    embeddings = await asyncio.to_thread(model.encode, texts)
    for i, emb in enumerate(embeddings):
        chunks[i]["embedding"] = emb.tolist()
        chunks[i]["chunk_index"] = i

    policy_id, document_id = await Repo.get_or_create_knowledge_document(db, os.path.basename(file_path))
    await Repo.delete_existing_chunks(db, document_id)
    await Repo.store_chunks(db, chunks, policy_id, document_id)

    return APIResponse.success_response(
        message="PDF processed successfully",
        data=UploadResponse(
            document_id=str(document_id),
            filename=os.path.basename(file_path),
            chunks_count=len(chunks),
        ).model_dump(),
    )
