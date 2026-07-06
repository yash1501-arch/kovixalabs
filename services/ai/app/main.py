import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import audit, batch, copy, documents, embed, face_enhance, face_swap, finetune, hashtags, health, images, memory, models, music, news_scraper, render, research, swarm, video, voiceover
from app.services.vector_store import vector_store

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": "0.1.0",
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(copy.router)
app.include_router(hashtags.router)
app.include_router(embed.router)
app.include_router(memory.router)
app.include_router(audit.router)
app.include_router(images.router)
app.include_router(video.router)
app.include_router(batch.router)
app.include_router(research.router)
app.include_router(voiceover.router)
app.include_router(render.router)
app.include_router(models.router)
app.include_router(news_scraper.router)
app.include_router(face_swap.router)
app.include_router(face_enhance.router)
app.include_router(documents.router)
app.include_router(swarm.router)
app.include_router(finetune.router)
app.include_router(music.router)

logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    logger.info("AISMOS AI service starting up")
    logger.info("LLM provider: %s | model: %s", settings.llm_provider, settings.llm_model)
    await vector_store.initialize()


@app.on_event("shutdown")
async def shutdown():
    logger.info("AISMOS AI service shutting down")
    await vector_store.close()


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info",
    )
