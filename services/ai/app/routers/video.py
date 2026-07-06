import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import verify_api_key

from app.models.schemas import (
    VideoScriptRequest,
    VideoScriptResponse,
    VideoScriptScene,
)
from app.services.embeddings import create_embedding_provider
from app.services.llm import create_llm_provider
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["video"], dependencies=[Depends(verify_api_key)])


@router.post("/video-scripts", response_model=VideoScriptResponse)
async def generate_video_script(request: VideoScriptRequest):
    try:
        brand_memory_text = ""
        if request.brand_id:
            provider = create_embedding_provider()
            query_embedding = await provider.embed([f"{request.topic} {request.platform} video script"])
            results = await vector_store.search_memory(
                query_embedding=query_embedding[0],
                brand_id=request.brand_id,
                limit=5,
            )
            brand_memory_text = "\n".join(f"[{r['title']}] {r['content']}" for r in results)

        mo = request.model_override
        llm = create_llm_provider(
            api_key=mo.api_key if mo else "",
            api_url=mo.api_url if mo else "",
            model=mo.model if mo else "",
            provider=mo.provider if mo else "",
        )

        scene_count = max(3, request.duration_seconds // 10)

        prompt = f"""You are AISMOS, an expert video scriptwriter. Create a {request.duration_seconds}-second video script for {request.platform}.

Topic: {request.topic}
Style: {request.style or "brand default"}
CTA: {request.cta or "Follow for more"}
Platform guidelines:
- Instagram/TikTok: Fast-paced, hook in first 3 seconds, trending audio
- YouTube: Slower pace, detailed, value-driven
- LinkedIn: Professional, educational, authoritative
- Facebook: Storytelling, emotional connection

Brand context:
{brand_memory_text or "No brand context provided."}

Generate exactly {scene_count} scenes. Total must equal {request.duration_seconds} seconds.

Return JSON with:
- "title": video title
- "hook": the opening hook line
- "scenes": array of {{ "scene_number", "duration_seconds", "visual_description", "spoken_text", "on_screen_text" }}
- "cta": call to action
- "hashtags": array of 5 relevant hashtags"""

        result = await llm.chat_json(
            messages=[
                {"role": "system", "content": "You are a video script expert. Always respond in valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
        )

        raw_scenes = result.get("scenes", [])
        scenes = [
            VideoScriptScene(
                scene_number=s.get("scene_number", i + 1),
                duration_seconds=s.get("duration_seconds", 10),
                visual_description=s.get("visual_description", ""),
                spoken_text=s.get("spoken_text", ""),
                on_screen_text=s.get("on_screen_text"),
            )
            for i, s in enumerate(raw_scenes)
        ]

        return VideoScriptResponse(
            task_id=str(uuid4()),
            title=result.get("title", f"{request.topic} - {request.platform}"),
            hook=result.get("hook", ""),
            scenes=scenes,
            cta=result.get("cta", request.cta or "Follow for more"),
            hashtags=result.get("hashtags", []),
        )

    except Exception as e:
        logger.exception("Video script generation failed")
        raise HTTPException(status_code=502, detail=str(e)) from e
