import logging

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.schemas import (
    BrandMemorySearchRequest,
    BrandMemorySearchResponse,
    BrandMemorySearchResult,
    EmbeddingRequest,
    EmbeddingResponse,
)
from app.services.embeddings import create_embedding_provider
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)
router = APIRouter(tags=["embeddings"])


@router.post("/embed", response_model=EmbeddingResponse)
async def embed_texts(request: EmbeddingRequest):
    try:
        provider = create_embedding_provider()
        embeddings = await provider.embed(request.texts)
        return EmbeddingResponse(
            embeddings=embeddings,
            model=settings.embedding_model,
            dimensions=len(embeddings[0]) if embeddings else 0,
        )
    except Exception as e:
        logger.exception("Embedding failed")
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/retrieve/brand-memory", response_model=BrandMemorySearchResponse)
async def search_brand_memory(request: BrandMemorySearchRequest):
    try:
        provider = create_embedding_provider()
        query_embedding = await provider.embed([request.query])
        results = await vector_store.search_memory(
            query_embedding=query_embedding[0],
            brand_id=request.brand_id,
            workspace_id=request.workspace_id,
            limit=request.limit,
        )
        return BrandMemorySearchResponse(
            results=[
                BrandMemorySearchResult(**r)
                for r in results
            ]
        )
    except Exception as e:
        logger.exception("Brand memory search failed")
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/score/brand-fit")
async def score_brand_fit():
    return {"score": 0.0, "feedback": "Brand fit scoring not yet implemented"}
