import io
import logging
import math
from uuid import uuid4

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.config import settings
from app.models.schemas import (
    SubtitleRequest,
    SubtitleResponse,
    VoiceoverRequest,
    VoiceoverResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["voiceover"])


@router.post("/voiceover", response_model=VoiceoverResponse)
async def generate_voiceover(request: VoiceoverRequest):
    try:
        headers = {
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": "tts-1",
            "input": request.text,
            "voice": request.voice,
            "speed": request.speed,
            "response_format": request.format,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{settings.llm_api_url.rstrip('/v1')}/v1/audio/speech",
                headers=headers,
                json=body,
            )
            response.raise_for_status()
            audio_data = response.content

        word_count = len(request.text.split())
        estimated_duration = (word_count / 150) / request.speed

        audio_b64 = io.BytesIO(audio_data).read().hex()[:64]

        logger.info(
            "Voiceover generated: %d chars, ~%.1fs, voice=%s",
            len(request.text), estimated_duration, request.voice,
        )

        return VoiceoverResponse(
            task_id=str(uuid4()),
            audio_url=f"data:audio/{request.format};base64,{audio_b64}",
            duration_seconds=round(estimated_duration, 1),
            format=request.format,
        )

    except Exception as e:
        logger.exception("Voiceover generation failed")
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/subtitles", response_model=SubtitleResponse)
async def generate_subtitles(request: SubtitleRequest):
    try:
        lines = []
        index = 1
        total_duration = 0.0

        for scene in request.scenes:
            text = scene.spoken_text
            start = scene.start_seconds
            end = scene.end_seconds
            total_duration = max(total_duration, end)

            words = text.split()
            if len(words) <= 3:
                start_ms = int(start * 1000)
                end_ms = int(end * 1000)
                lines.append(f"{index}\n{_ms_to_srt(start_ms)} --> {_ms_to_srt(end_ms)}\n{text}\n")
                index += 1
                continue

            chunk_size = max(1, len(words) // max(1, round((end - start) / 2)))
            chunks = []
            for i in range(0, len(words), chunk_size):
                chunks.append(" ".join(words[i:i + chunk_size]))

            chunk_duration = (end - start) / len(chunks)
            for j, chunk in enumerate(chunks):
                chunk_start = start + j * chunk_duration
                chunk_end = chunk_start + chunk_duration
                start_ms = int(chunk_start * 1000)
                end_ms = int(chunk_end * 1000)
                lines.append(f"{index}\n{_ms_to_srt(start_ms)} --> {_ms_to_srt(end_ms)}\n{chunk}\n")
                index += 1

        return SubtitleResponse(
            content="\n".join(lines),
            format=request.format,
            total_duration_seconds=round(total_duration, 1),
        )

    except Exception as e:
        logger.exception("Subtitle generation failed")
        raise HTTPException(status_code=502, detail=str(e)) from e


def _ms_to_srt(ms: int) -> str:
    hours = ms // 3600000
    minutes = (ms % 3600000) // 60000
    seconds = (ms % 60000) // 1000
    millis = ms % 1000
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"
