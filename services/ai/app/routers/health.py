from datetime import datetime, timezone

from fastapi import APIRouter

from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    return {
        "service": settings.app_name,
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dependencies": {
            "llm": settings.llm_api_url if settings.llm_api_key else "not configured",
            "qdrant": settings.qdrant_url,
            "redis": settings.redis_url,
        },
    }
