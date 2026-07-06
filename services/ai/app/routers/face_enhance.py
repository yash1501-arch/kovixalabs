import logging
from uuid import uuid4

from fastapi import APIRouter, Depends

from app.middleware.auth import verify_api_key
from pydantic import BaseModel, Field

from app.models.schemas import ModelOverride
from app.services.llm import create_llm_provider

logger = logging.getLogger(__name__)
router = APIRouter(tags=["face_enhance"], dependencies=[Depends(verify_api_key)])


class FaceEnhanceRequest(BaseModel):
    image_url: str
    style: str = "natural"
    brand_context: str | None = None
    model_override: ModelOverride | None = None


class FaceEnhanceResponse(BaseModel):
    task_id: str
    enhancements: list[dict] = Field(default_factory=list)
    processing_parameters: dict = Field(default_factory=dict)
    estimated_time_seconds: int = 30


@router.post("/face/enhance", response_model=FaceEnhanceResponse)
async def analyze_face_enhancement(request: FaceEnhanceRequest):
    """Analyze a face image and recommend enhancement parameters."""
    mo = request.model_override
    llm = create_llm_provider(
        api_key=mo.api_key if mo else "",
        api_url=mo.api_url if mo else "",
        model=mo.model if mo else "",
        provider=mo.provider if mo else "",
    )

    messages = [
        {"role": "system", "content": "You are an expert AI image enhancement analyst specializing in portrait and face enhancement. Analyze face images and recommend optimal enhancement parameters."},
        {"role": "user", "content": f"""Analyze this face image and recommend enhancement parameters:

Image URL: {request.image_url}
Style preference: {request.style}
Brand context: {request.brand_context or ""}

Respond with this exact JSON structure:
{{
  "enhancements": [
    {{
      "type": "skin_smoothing",
      "description": "Light skin smoothing to even tone",
      "intensity": 0.3,
      "priority": "optional"
    }},
    {{
      "type": "lighting_correction",
      "description": "Adjust exposure and contrast",
      "intensity": 0.5,
      "priority": "recommended"
    }}
  ],
  "processing_parameters": {{
    "color_correction": true,
    "sharpen": 0.2,
    "denoise": 0.3,
    "super_resolution": false,
    "output_format": "png"
  }},
  "estimated_time_seconds": 30
}}
Enhancement types: skin_smoothing, lighting_correction, color_balance, sharpen, denoise, red_eye_removal, teeth_whitening, super_resolution, background_cleanup, blemish_removal
Priorities: essential, recommended, optional
Intensity: 0.0-1.0"""},
    ]

    try:
        result = await llm.chat_json(messages)
        enhancements = [
            {
                "type": e.get("type", ""),
                "description": e.get("description", ""),
                "intensity": float(e.get("intensity", 0.5)),
                "priority": e.get("priority", "optional"),
            }
            for e in result.get("enhancements", [])
        ]
        params = result.get("processing_parameters", {})
        return FaceEnhanceResponse(
            task_id=str(uuid4()),
            enhancements=enhancements,
            processing_parameters={
                "color_correction": bool(params.get("color_correction", True)),
                "sharpen": float(params.get("sharpen", 0.2)),
                "denoise": float(params.get("denoise", 0.3)),
                "super_resolution": bool(params.get("super_resolution", False)),
                "output_format": str(params.get("output_format", "png")),
            },
            estimated_time_seconds=int(result.get("estimated_time_seconds", 30)),
        )
    except Exception as e:
        logger.warning("Face enhancement analysis failed: %s", e)
        return FaceEnhanceResponse(
            task_id=str(uuid4()),
            enhancements=[{"type": "lighting_correction", "description": "Default lighting correction", "intensity": 0.5, "priority": "recommended"}],
            processing_parameters={"color_correction": True, "sharpen": 0.2, "denoise": 0.3, "super_resolution": False, "output_format": "png"},
            estimated_time_seconds=30,
        )
