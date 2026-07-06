import logging
import re
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import verify_api_key
from pydantic import BaseModel, Field

from app.models.schemas import MemoryIngestResponse, ModelOverride
from app.services.embeddings import create_embedding_provider
from app.services.llm import create_llm_provider
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"], dependencies=[Depends(verify_api_key)])


class DocumentIngestRequest(BaseModel):
    workspace_id: str
    brand_id: str
    title: str
    content: str
    source: str = "upload"
    chunk_size: int = Field(default=500, ge=100, le=2000)
    overlap: int = Field(default=50, ge=0, le=500)


class DocumentChunk(BaseModel):
    entry_id: str
    title: str
    content: str
    tags: list[str]


class DocumentIngestResponse(BaseModel):
    status: str
    chunks_created: int
    chunks: list[DocumentChunk]


class DocumentSummarizeRequest(BaseModel):
    workspace_id: str
    brand_id: str
    title: str
    content: str
    model_override: ModelOverride | None = None


class DocumentSummarizeResponse(BaseModel):
    summary: str
    key_points: list[str]
    brand_relevance: str
    suggested_tags: list[str]


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    paragraphs = re.split(r"\n\s*\n", text)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        para_len = len(para)

        if current_len + para_len > chunk_size and current:
            chunk_text = "\n\n".join(current)
            chunks.append(chunk_text)

            overlap_text = current
            overlap_chars = 0
            for p in reversed(current):
                if overlap_chars + len(p) > overlap:
                    break
                overlap_chars += len(p)
                overlap_text = overlap_text[:-1]
            current = list(overlap_text) if overlap_text else []
            current_len = sum(len(p) for p in current)

        current.append(para)
        current_len += para_len

    if current:
        chunks.append("\n\n".join(current))

    return chunks


@router.post("/ingest", response_model=DocumentIngestResponse)
async def ingest_document(request: DocumentIngestRequest):
    try:
        chunks = chunk_text(request.content, request.chunk_size, request.overlap)
        provider = create_embedding_provider()

        result_chunks: list[DocumentChunk] = []
        for i, chunk_content in enumerate(chunks):
            entry_id = str(uuid4())
            chunk_title = f"{request.title} [Part {i + 1}/{len(chunks)}]"
            chunk_tags = [request.source, f"part-{i + 1}"]

            text_to_embed = f"{chunk_title}\n{chunk_content}"
            embeddings = await provider.embed([text_to_embed])
            embedding = embeddings[0]

            await vector_store.upsert_memory(
                entry_id=entry_id,
                embedding=embedding,
                payload={
                    "workspace_id": request.workspace_id,
                    "brand_id": request.brand_id,
                    "title": chunk_title,
                    "content": chunk_content,
                    "tags": chunk_tags,
                    "source": request.source,
                },
            )

            result_chunks.append(DocumentChunk(
                entry_id=entry_id,
                title=chunk_title,
                content=chunk_content[:200],
                tags=chunk_tags,
            ))

        logger.info(
            "Document ingested: %s (%d chunks) for brand=%s",
            request.title, len(chunks), request.brand_id,
        )
        return DocumentIngestResponse(
            status="ok",
            chunks_created=len(chunks),
            chunks=result_chunks,
        )

    except Exception as e:
        logger.exception("Document ingestion failed")
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/summarize", response_model=DocumentSummarizeResponse)
async def summarize_document(request: DocumentSummarizeRequest):
    try:
        mo = request.model_override
        llm = create_llm_provider(
            api_key=mo.api_key if mo else "",
            api_url=mo.api_url if mo else "",
            model=mo.model if mo else "",
            provider=mo.provider if mo else "",
        )

        messages = [
            {"role": "system", "content": "You are a brand intelligence analyst. Extract key brand insights from documents. Respond in valid JSON."},
            {"role": "user", "content": f"""Analyze this brand document and extract key information:

Title: {request.title}
Content: {request.content[:8000]}

Return JSON:
{{
  "summary": "2-3 sentence summary",
  "key_points": ["point 1", "point 2", ...],
  "brand_relevance": "How this relates to brand strategy",
  "suggested_tags": ["tag1", "tag2", ...]
}}"""},
        ]

        result = await llm.chat_json(messages, temperature=0.3)

        return DocumentSummarizeResponse(
            summary=result.get("summary", ""),
            key_points=result.get("key_points", []),
            brand_relevance=result.get("brand_relevance", ""),
            suggested_tags=result.get("suggested_tags", []),
        )

    except Exception as e:
        logger.exception("Document summarization failed")
        raise HTTPException(status_code=502, detail=str(e)) from e
