import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import verify_api_key

from app.models.schemas import (
    ContentFeedbackRequest,
    ContentFeedbackResponse,
    MemoryDeleteRequest,
    MemoryDeleteResponse,
    MemoryIngestRequest,
    MemoryIngestResponse,
)
from app.services.embeddings import create_embedding_provider
from app.services.llm import create_llm_provider
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memory", tags=["memory"], dependencies=[Depends(verify_api_key)])


@router.post("/ingest", response_model=MemoryIngestResponse)
async def ingest_memory(request: MemoryIngestRequest):
    try:
        provider = create_embedding_provider()
        text_to_embed = f"{request.title}\n{request.content}"
        embeddings = await provider.embed([text_to_embed])
        embedding = embeddings[0]

        payload = {
            "workspace_id": request.workspace_id,
            "brand_id": request.brand_id,
            "title": request.title,
            "content": request.content,
            "tags": request.tags,
            "source": request.source,
        }
        await vector_store.upsert_memory(
            entry_id=request.entry_id,
            embedding=embedding,
            payload=payload,
        )
        logger.info("Memory ingested: %s (brand=%s)", request.entry_id, request.brand_id)
        return MemoryIngestResponse(status="ok", entry_id=request.entry_id)
    except Exception as e:
        logger.exception("Memory ingestion failed")
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/delete", response_model=MemoryDeleteResponse)
async def delete_memory(request: MemoryDeleteRequest):
    try:
        await vector_store.delete_memory(request.entry_id)
        logger.info("Memory deleted: %s", request.entry_id)
        return MemoryDeleteResponse(status="ok", entry_id=request.entry_id)
    except Exception as e:
        logger.exception("Memory deletion failed")
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/learn", response_model=ContentFeedbackResponse)
async def learn_from_content(request: ContentFeedbackRequest):
    """
    Continuous learning endpoint.
    When content performs well (or poorly), this extracts insights and stores them
    as new brand memory entries, improving future generations.
    """
    try:
        mo = request.model_override
        llm = create_llm_provider(
            api_key=mo.api_key if mo else "",
            api_url=mo.api_url if mo else "",
            model=mo.model if mo else "",
            provider=mo.provider if mo else "",
        )
        insights = []
        entries_created = 0

        prompt = f"""You are AISMOS's learning engine. Analyze this content performance and extract brand insights.

Platform: {request.platform}
Caption: {request.caption}
Hashtags: {', '.join(request.hashtags)}
Performance Score: {request.performance_score}
Engagement Data: {request.engagement}

Extract actionable insights:
1. What worked well (if score > 0.5) or what went wrong (if score < 0.5)
2. Content patterns to reinforce or avoid
3. Audience preferences revealed
4. Recommended adjustments for future content

Return JSON with "insights" array of 1-3 strings."""

        result = await llm.chat_json(
            messages=[
                {"role": "system", "content": "You are an AI learning and analytics engine. Always respond in valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )

        raw_insights = result.get("insights", [])
        provider = create_embedding_provider()

        for insight_text in raw_insights:
            memory_id = str(uuid4())
            memory_title = f"Learning: {request.platform} — {request.post_id[:8]}"
            embeddings = await provider.embed([insight_text])
            await vector_store.upsert_memory(
                entry_id=memory_id,
                embedding=embeddings[0],
                payload={
                    "workspace_id": request.workspace_id,
                    "brand_id": request.brand_id,
                    "title": memory_title,
                    "content": insight_text,
                    "tags": ["learning", "performance", request.platform],
                    "source": "learning_engine",
                },
            )
            entries_created += 1
            insights.append(insight_text)

        logger.info("Learning complete: %d insights stored for brand=%s", entries_created, request.brand_id)
        return ContentFeedbackResponse(
            status="ok",
            memory_entries_created=entries_created,
            insights=insights,
        )
    except Exception as e:
        logger.exception("Learning from content failed")
        raise HTTPException(status_code=502, detail=str(e)) from e
