import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import verify_api_key
from pydantic import BaseModel, Field

from app.models.schemas import ModelOverride
from app.services.llm import create_llm_provider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["music"], dependencies=[Depends(verify_api_key)])


class MusicGenerationRequest(BaseModel):
    genre: str
    mood: str
    duration_seconds: int = Field(default=30, ge=5, le=300)
    style: str | None = None
    prompt: str | None = None
    model_override: ModelOverride | None = None


class MusicGenerationResponse(BaseModel):
    task_id: str
    audio_url: str
    title: str
    genre: str
    mood: str
    duration_seconds: int


@router.post("/music", response_model=MusicGenerationResponse)
async def generate_music(request: MusicGenerationRequest):
    """Generate music using the workspace's configured LLM.

    Uses the LLM to describe the desired track, then returns a mock audio URL.
    In production, would call Suno, ElevenLabs, or a similar music generation API.
    """
    try:
        mo = request.model_override
        llm = create_llm_provider(
            api_key=mo.api_key if mo else "",
            api_url=mo.api_url if mo else "",
            model=mo.model if mo else "",
            provider=mo.provider if mo else "",
        )

        prompt_text = request.prompt or f"Describe a {request.duration_seconds}-second {request.genre} track with a {request.mood} mood"
        if request.style:
            prompt_text += f" in {request.style} style"

        messages = [
            {"role": "system", "content": "You are AISMOS's music AI. Describe the musical elements of a track based on the given parameters. Be creative and specific."},
            {"role": "user", "content": f"""Generate a music production brief with these parameters:
Genre: {request.genre}
Mood: {request.mood}
Duration: {request.duration_seconds}s
Style: {request.style or "default"}

{prompt_text}

Respond with this exact JSON:
{{
  "title": "catchy track title",
  "bpm": 120,
  "key": "C major",
  "instruments": ["instrument1", "instrument2"],
  "description": "short description of the track"
}}"""},
        ]

        result = await llm.chat_json(messages=messages, temperature=0.8)

        title = result.get("title", f"{request.mood} {request.genre}")
        task_id = str(uuid4())

        logger.info("Generated music brief: %s (genre=%s, mood=%s)", title, request.genre, request.mood)
        return MusicGenerationResponse(
            task_id=task_id,
            audio_url=f"https://audio.aismos.ai/generated/{task_id}.mp3",
            title=title,
            genre=request.genre,
            mood=request.mood,
            duration_seconds=request.duration_seconds,
        )

    except Exception as e:
        logger.exception("Music generation failed")
        raise HTTPException(status_code=502, detail=str(e)) from e
