import logging
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    BatchContentRequest,
    BatchContentResponse,
    BatchContentVariant,
    VideoScriptResponse,
    VideoScriptScene,
)
from app.services.embeddings import create_embedding_provider
from app.services.llm import create_llm_provider
from app.services.prompts import build_caption_messages
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["batch"])


@router.post("/batch", response_model=BatchContentResponse)
async def generate_batch(request: BatchContentRequest):
    try:
        llm = create_llm_provider()
        provider = create_embedding_provider()
        brand_memory_texts: list[str] = []

        if request.brand_id:
            query_embedding = await provider.embed([f"{request.objective} {request.topic} {request.platform}"])
            results = await vector_store.search_memory(
                query_embedding=query_embedding[0],
                brand_id=request.brand_id,
                limit=5,
            )
            brand_memory_texts = [f"[{r['title']}] {r['content']}" for r in results]

        caption_messages = build_caption_messages(
            brand_memory=brand_memory_texts,
            platform=request.platform,
            objective=request.objective,
            topic=request.topic,
            tone=request.tone,
            variant_count=request.variant_count,
        )
        caption_result = await llm.chat_json(messages=caption_messages, temperature=0.8)

        hashtag_prompt = f"""For each of the captions below, generate an optimized hashtag set for {request.platform}.
Each set needs 2-3 trending, 2-3 niche, and 1-2 branded hashtags.

Brand context:
{chr(10).join(brand_memory_texts) if brand_memory_texts else "No brand context."}

Return JSON with a "hashtag_sets" array, one per caption variant.
Each entry: {{ "trending": [...], "niche": [...], "branded": [...] }}"""

        hashtag_result = await llm.chat_json(
            messages=[
                {"role": "system", "content": "You are a hashtag strategy expert. Always respond in valid JSON."},
                {"role": "user", "content": hashtag_prompt},
            ],
            temperature=0.6,
        )

        raw_variants = caption_result.get("variants", [])
        hashtag_sets = hashtag_result.get("hashtag_sets", [])

        variants: list[BatchContentVariant] = []
        for i, v in enumerate(raw_variants):
            hs = hashtag_sets[i] if i < len(hashtag_sets) else {"trending": [], "niche": [], "branded": []}
            all_tags = hs.get("trending", []) + hs.get("niche", []) + hs.get("branded", [])
            variants.append(
                BatchContentVariant(
                    id=str(uuid4()),
                    caption=v.get("caption", ""),
                    rationale=v.get("rationale", ""),
                    hashtags=all_tags,
                    image_url=None,
                )
            )

        video_script: VideoScriptResponse | None = None
        if request.generate_video_script:
            scene_prompt = f"""Create a {request.topic} video script for {request.platform}.

Topic: {request.topic}
Brand context:
{chr(10).join(brand_memory_texts) if brand_memory_texts else "No brand context."}

Generate 3 scenes. Return JSON with:
- "title": video title
- "hook": opening hook
- "scenes": array of {{ "scene_number", "duration_seconds": 10, "visual_description", "spoken_text" }}
- "cta": call to action
- "hashtags": array of 5 hashtags"""

            video_result = await llm.chat_json(
                messages=[
                    {"role": "system", "content": "You are a video scriptwriter. Always respond in valid JSON."},
                    {"role": "user", "content": scene_prompt},
                ],
                temperature=0.7,
            )

            raw_scenes = video_result.get("scenes", [])
            video_script = VideoScriptResponse(
                task_id=str(uuid4()),
                title=video_result.get("title", request.topic),
                hook=video_result.get("hook", ""),
                scenes=[
                    VideoScriptScene(
                        scene_number=s.get("scene_number", i + 1),
                        duration_seconds=s.get("duration_seconds", 10),
                        visual_description=s.get("visual_description", ""),
                        spoken_text=s.get("spoken_text", ""),
                    )
                    for i, s in enumerate(raw_scenes)
                ],
                cta=video_result.get("cta", "Follow for more"),
                hashtags=video_result.get("hashtags", []),
            )

        return BatchContentResponse(
            task_id=str(uuid4()),
            model=llm.model,
            brand_id=request.brand_id,
            platform=request.platform,
            topic=request.topic,
            variants=variants,
            video_script=video_script,
        )

    except Exception as e:
        logger.exception("Batch generation failed")
        raise HTTPException(status_code=502, detail=str(e)) from e
