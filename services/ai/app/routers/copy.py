import logging
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.models.schemas import CopyGenerationRequest, CopyGenerationResponse, CopyVariant
from app.services.embeddings import create_embedding_provider
from app.services.llm import create_llm_provider
from app.services.prompts import build_caption_messages
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["copy"])


@router.post("/copy", response_model=CopyGenerationResponse)
async def generate_copy(request: CopyGenerationRequest):
    try:
        brand_memory = list(request.brand_memory)

        if request.brand_id and not brand_memory:
            provider = create_embedding_provider()
            query_text = f"{request.objective} {request.topic} {request.platform}"
            query_embedding = await provider.embed([query_text])
            results = await vector_store.search_memory(
                query_embedding=query_embedding[0],
                brand_id=request.brand_id,
                limit=5,
            )
            brand_memory = [
                f"[{r['title']}] {r['content']}" for r in results
            ]

        llm = create_llm_provider()
        messages = build_caption_messages(
            brand_memory=brand_memory,
            platform=request.platform,
            objective=request.objective,
            topic=request.topic,
            tone=request.tone,
            variant_count=request.variants,
        )
        result = await llm.chat_json(messages=messages, temperature=0.8)
        raw_variants = result.get("variants", [])

        variants = []
        for v in raw_variants:
            variants.append(
                CopyVariant(
                    id=str(uuid4()),
                    caption=v.get("caption", ""),
                    rationale=v.get("rationale", ""),
                )
            )

        return CopyGenerationResponse(
            task_id=str(uuid4()),
            model=llm.model,
            variants=variants,
        )
    except Exception as e:
        logger.exception("Copy generation failed")
        raise HTTPException(status_code=502, detail=str(e)) from e
