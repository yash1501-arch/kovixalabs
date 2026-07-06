import logging

from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import verify_api_key

from app.models.schemas import HashtagGenerationRequest, HashtagSet
from app.services.embeddings import create_embedding_provider
from app.services.llm import create_llm_provider
from app.services.prompts import build_hashtag_messages
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["hashtags"], dependencies=[Depends(verify_api_key)])


@router.post("/hashtags", response_model=HashtagSet)
async def generate_hashtags(request: HashtagGenerationRequest):
    try:
        brand_memory = []

        if request.brand_id:
            provider = create_embedding_provider()
            query_text = f"hashtags brand identity {request.topic} {request.platform}"
            query_embedding = await provider.embed([query_text])
            results = await vector_store.search_memory(
                query_embedding=query_embedding[0],
                brand_id=request.brand_id,
                limit=3,
            )
            brand_memory = [r["content"] for r in results]

        mo = request.model_override
        llm = create_llm_provider(
            api_key=mo.api_key if mo else "",
            api_url=mo.api_url if mo else "",
            model=mo.model if mo else "",
            provider=mo.provider if mo else "",
        )
        messages = build_hashtag_messages(
            platform=request.platform,
            topic=request.topic,
            caption=request.caption,
            brand_memory=brand_memory,
        )
        result = await llm.chat_json(messages=messages, temperature=0.6)
        return HashtagSet(
            trending=result.get("trending", []),
            niche=result.get("niche", []),
            branded=result.get("branded", []),
        )
    except Exception as e:
        logger.exception("Hashtag generation failed")
        raise HTTPException(status_code=502, detail=str(e)) from e
