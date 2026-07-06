import logging

from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import verify_api_key
from pydantic import BaseModel

from app.config import settings
from app.services.llm import create_llm_provider

logger = logging.getLogger(__name__)
router = APIRouter(tags=["models"], dependencies=[Depends(verify_api_key)])


@router.get("/models")
async def list_models():
    """Return the currently configured model and available providers."""
    return {
        "default_provider": settings.llm_provider,
        "default_model": settings.llm_model,
        "fallback_model": settings.llm_fallback_model,
        "available_providers": ["openai", "openrouter"],
        "configured": bool(settings.llm_api_key),
    }


class ChatRequest(BaseModel):
    messages: list[dict]
    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    api_key: str | None = None
    api_url: str | None = None


class ChatResponse(BaseModel):
    content: str
    model: str


@router.post("/models/chat", response_model=ChatResponse)
async def chat_with_model(req: ChatRequest):
    """Chat with a specific model configuration.

    Accepts optional overrides for model, temperature, max_tokens, api_key, and api_url.
    Falls back to the service's default configuration when not provided.
    """
    try:
        provider = create_llm_provider(
            api_key=req.api_key or "",
            api_url=req.api_url or "",
        )
        content = await provider.chat(
            messages=[{"role": m["role"], "content": m["content"]} for m in req.messages],
            model=req.model or settings.llm_model,
            temperature=req.temperature or 0.7,
            max_tokens=req.max_tokens or 2048,
        )
        return ChatResponse(content=content, model=req.model or settings.llm_model)
    except Exception as e:
        logger.error("Model chat failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))
