import logging
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.schemas import ImageGenerationRequest, ImageGenerationResponse
from app.services.vector_store import vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["images"])


@router.post("/images", response_model=ImageGenerationResponse)
async def generate_images(request: ImageGenerationRequest):
    try:
        brand_context = ""
        if request.brand_id:
            from app.services.embeddings import create_embedding_provider
            provider = create_embedding_provider()
            query_embedding = await provider.embed([request.prompt])
            results = await vector_store.search_memory(
                query_embedding=query_embedding[0],
                brand_id=request.brand_id,
                limit=3,
            )
            visual_notes = [r["content"] for r in results if "visual" in r.get("tags", []) or "style" in r.get("tags", [])]
            if visual_notes:
                brand_context = "\n".join(visual_notes)

        aspect_ratio_map = {
            "1:1": "1024x1024",
            "16:9": "1792x1024",
            "9:16": "1024x1792",
            "4:3": "1024x768",
            "3:4": "768x1024",
        }
        size = aspect_ratio_map.get(request.aspect_ratio, "1024x1024")

        style_prompt = f" in {request.style} style" if request.style else ""
        brand_instruction = f"\nBrand visual context:\n{brand_context}" if brand_context else ""
        full_prompt = f"{request.prompt}{style_prompt}{brand_instruction}"

        headers = {
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": "dall-e-3",
            "prompt": full_prompt,
            "n": request.count,
            "size": size,
            "quality": "standard",
            "response_format": "url",
        }

        async with __import__("httpx").AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{settings.llm_api_url.rstrip('/v1')}/v1/images/generations",
                headers=headers,
                json=body,
            )
            response.raise_for_status()
            data = response.json()
            image_urls = [item["url"] for item in data.get("data", [])]

        logger.info("Generated %d images for brand=%s", len(image_urls), request.brand_id)
        return ImageGenerationResponse(task_id=str(uuid4()), images=image_urls)

    except Exception as e:
        logger.exception("Image generation failed")
        raise HTTPException(status_code=502, detail=str(e)) from e
