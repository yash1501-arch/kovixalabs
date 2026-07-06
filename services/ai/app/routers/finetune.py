import json
import logging
import tempfile
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import verify_api_key
from pydantic import BaseModel, Field

from app.config import settings
from app.models.schemas import ModelOverride

logger = logging.getLogger(__name__)
router = APIRouter(tags=["finetune"], dependencies=[Depends(verify_api_key)])

OPENAI_API_BASE = "https://api.openai.com/v1"


class FinetuneJobRequest(BaseModel):
    workspace_id: str
    brand_id: str
    job_name: str
    base_model: str
    training_data: list[dict] = Field(default_factory=list, description="List of {prompt, completion} pairs")
    epochs: int = Field(default=3, ge=1, le=50)
    learning_rate: float = Field(default=2e-5, ge=1e-6, le=1e-3)
    model_override: ModelOverride | None = None


class FinetuneJobResponse(BaseModel):
    job_id: str
    status: str
    job_name: str
    base_model: str
    trained_model: str
    epochs: int
    estimated_duration_seconds: int
    model_override_used: bool


class FinetuneChatRequest(BaseModel):
    model_name: str
    messages: list[dict]
    temperature: float = 0.7
    max_tokens: int = 2048
    model_override: ModelOverride | None = None


class FinetuneChatResponse(BaseModel):
    content: str
    model: str


def _get_api_key(mo: ModelOverride | None) -> str:
    if mo and mo.api_key:
        return mo.api_key
    return settings.llm_api_key


def _convert_to_openai_messages(prompt: str, completion: str) -> list[dict]:
    return [
        {"role": "system", "content": "You are a brand content creator."},
        {"role": "user", "content": prompt},
        {"role": "assistant", "content": completion},
    ]


async def _upload_training_file(api_key: str, training_data: list[dict]) -> str:
    lines = []
    for pair in training_data:
        msgs = _convert_to_openai_messages(pair.get("prompt", ""), pair.get("completion", ""))
        lines.append(json.dumps({"messages": msgs}))
    content = "\n".join(lines)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False) as f:
        f.write(content)
        f.flush()
        file_path = f.name

    async with httpx.AsyncClient() as client:
        with open(file_path, "rb") as f:
            resp = await client.post(
                f"{OPENAI_API_BASE}/files",
                headers={"Authorization": f"Bearer {api_key}"},
                data={"purpose": "fine-tune"},
                files={"file": ("training.jsonl", f, "application/jsonl")},
                timeout=120,
            )
        if resp.status_code >= 400:
            raise RuntimeError(f"OpenAI upload failed: {resp.text}")
        return resp.json()["id"]


async def _create_finetune_job_openai(api_key: str, file_id: str, base_model: str, epochs: int) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{OPENAI_API_BASE}/fine_tuning/jobs",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "training_file": file_id,
                "model": base_model,
                "hyperparameters": {"n_epochs": epochs},
            },
            timeout=60,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"OpenAI fine-tune create failed: {resp.text}")
        return resp.json()


async def _get_finetune_job_openai(api_key: str, openai_job_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{OPENAI_API_BASE}/fine_tuning/jobs/{openai_job_id}",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"OpenAI fine-tune status failed: {resp.text}")
        return resp.json()


@router.post("/finetune/jobs", response_model=FinetuneJobResponse)
async def create_finetune_job(request: FinetuneJobRequest):
    try:
        job_id = str(uuid4())
        api_key = _get_api_key(request.model_override)
        base_model = request.base_model
        trained_model = f"{base_model}-{request.brand_id[:8]}-{job_id[:8]}"

        if not api_key or api_key == "":
            logger.warning("No API key configured — returning mock fine-tune job")
            return FinetuneJobResponse(
                job_id=job_id, status="queued", job_name=request.job_name,
                base_model=base_model, trained_model=trained_model,
                epochs=request.epochs,
                estimated_duration_seconds=request.epochs * len(request.training_data) * 30 if request.training_data else 300,
                model_override_used=request.model_override is not None,
            )

        if not request.training_data:
            raise HTTPException(status_code=400, detail="training_data is required when API key is configured")

        logger.info("Uploading training file for fine-tune job %s", job_id)
        file_id = await _upload_training_file(api_key, request.training_data)

        logger.info("Creating OpenAI fine-tune job %s on model %s", job_id, base_model)
        openai_job = await _create_finetune_job_openai(api_key, file_id, base_model, request.epochs)

        openai_job_id = openai_job.get("id", "")
        estimated = request.epochs * len(request.training_data) * 30

        return FinetuneJobResponse(
            job_id=openai_job_id,
            status=openai_job.get("status", "queued"),
            job_name=request.job_name,
            base_model=base_model,
            trained_model=f"ft:{base_model}:{openai_job_id}",
            epochs=request.epochs,
            estimated_duration_seconds=estimated,
            model_override_used=request.model_override is not None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Fine-tune job creation failed")
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post("/finetune/chat", response_model=FinetuneChatResponse)
async def finetune_chat(request: FinetuneChatRequest):
    try:
        from app.services.llm import create_llm_provider

        mo = request.model_override
        llm = create_llm_provider(
            api_key=mo.api_key if mo else "",
            api_url=mo.api_url if mo else "",
            model=request.model_name,
            provider=mo.provider if mo else "",
        )
        content = await llm.chat(
            messages=[{"role": m["role"], "content": m["content"]} for m in request.messages],
            model=request.model_name,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        return FinetuneChatResponse(content=content, model=request.model_name)
    except Exception as e:
        logger.exception("Fine-tune chat failed")
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/finetune/jobs/{job_id}", response_model=FinetuneJobResponse)
async def get_finetune_job(job_id: str):
    try:
        api_key = settings.llm_api_key

        openai_job = await _get_finetune_job_openai(api_key, job_id)

        status = openai_job.get("status", "unknown")
        openai_status_mapping = {
            "validating_files": "validating",
            "queued": "queued",
            "running": "running",
            "succeeded": "completed",
            "failed": "failed",
            "cancelled": "cancelled",
        }
        mapped_status = openai_status_mapping.get(status, status)
        trained_model = openai_job.get("fine_tuned_model") or f"ft:{openai_job.get('model', '')}:{job_id}"

        return FinetuneJobResponse(
            job_id=job_id,
            status=mapped_status,
            job_name=openai_job.get("model", ""),
            base_model=openai_job.get("model", ""),
            trained_model=trained_model,
            epochs=openai_job.get("hyperparameters", {}).get("n_epochs", 3),
            estimated_duration_seconds=0,
            model_override_used=False,
        )
    except Exception as e:
        logger.exception("Failed to get fine-tune job status")
        raise HTTPException(status_code=502, detail=str(e)) from e
