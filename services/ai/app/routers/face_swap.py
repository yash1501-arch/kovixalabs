import logging
import uuid

from fastapi import APIRouter, Depends

from app.middleware.auth import verify_api_key
from pydantic import BaseModel, Field

from app.models.schemas import (
    FaceSwapAnalyzeRequest,
    FaceSwapAnalyzeResponse,
    ModelOverride,
)
from app.services.llm import create_llm_provider

logger = logging.getLogger(__name__)

router = APIRouter(tags=["face_swap"], dependencies=[Depends(verify_api_key)])


class VideoFaceSwapAnalyzeRequest(BaseModel):
    source_face_url: str
    target_video_url: str
    brand_context: str | None = None
    model_override: ModelOverride | None = None


class VideoFaceSwapAnalyzeResponse(BaseModel):
    compatible: bool
    confidence: float = Field(ge=0, le=1)
    recommendations: list[str]
    parameters: dict[str, object] = Field(default_factory=dict)
    estimated_processing_time_seconds: int = 60


@router.post("/face-swap/video-analyze", response_model=VideoFaceSwapAnalyzeResponse)
async def analyze_video_face_swap(request: VideoFaceSwapAnalyzeRequest):
    """Analyze source face and target video for video face swap compatibility.
    Returns recommendations and estimated processing time."""
    mo = request.model_override
    llm = create_llm_provider(
        api_key=mo.api_key if mo else "",
        api_url=mo.api_url if mo else "",
        model=mo.model if mo else "",
        provider=mo.provider if mo else "",
    )
    brand_context = request.brand_context or ""

    messages = [
        {"role": "system", "content": "You are an expert AI media analyst specializing in video face swap operations. Analyze source face image and target video for compatibility."},
        {"role": "user", "content": f"""Analyze these for a video face swap operation:

Brand context: {brand_context}

Source face image URL: {request.source_face_url}
Target video URL: {request.target_video_url}

Respond with this exact JSON:
{{
  "compatible": true/false,
  "confidence": 0.0-1.0,
  "recommendations": ["recommendation 1", "recommendation 2"],
  "parameters": {{
    "face_detection_threshold": 0.5,
    "tracking_method": "mediapipe",
    "blend_ratio": 0.7,
    "color_correction": true,
    "output_format": "mp4"
  }},
  "estimated_processing_time_seconds": 60
}}"""},
    ]

    try:
        result = await llm.chat_json(messages)
        params = result.get("parameters", {})
        return VideoFaceSwapAnalyzeResponse(
            compatible=bool(result.get("compatible", True)),
            confidence=float(result.get("confidence", 0.7)),
            recommendations=result.get("recommendations", []),
            parameters={
                "face_detection_threshold": float(params.get("face_detection_threshold", 0.5)),
                "tracking_method": str(params.get("tracking_method", "mediapipe")),
                "blend_ratio": float(params.get("blend_ratio", 0.7)),
                "color_correction": bool(params.get("color_correction", True)),
                "output_format": str(params.get("output_format", "mp4")),
            },
            estimated_processing_time_seconds=int(result.get("estimated_processing_time_seconds", 60)),
        )
    except Exception as e:
        logger.warning("Video face swap analysis failed: %s", e)
        return VideoFaceSwapAnalyzeResponse(
            compatible=True,
            confidence=0.5,
            recommendations=["Using default parameters. Manual verification recommended."],
            parameters={"face_detection_threshold": 0.5, "tracking_method": "mediapipe", "blend_ratio": 0.7, "color_correction": True, "output_format": "mp4"},
            estimated_processing_time_seconds=60,
        )


@router.post("/face-swap/analyze", response_model=FaceSwapAnalyzeResponse)
async def analyze_face_swap(request: FaceSwapAnalyzeRequest):
    """Analyze source and target images for face swap compatibility.
    Returns recommendations and optimal parameters for the face swap operation."""
    mo = request.model_override
    llm = create_llm_provider(
        api_key=mo.api_key if mo else "",
        api_url=mo.api_url if mo else "",
        model=mo.model if mo else "",
        provider=mo.provider if mo else "",
    )
    brand_context = request.brand_context or ""

    messages = [
        {"role": "system", "content": "You are an expert AI media analyst specializing in face swap operations. Analyze source and target images for compatibility and provide optimal parameters."},
        {"role": "user", "content": f"""Analyze these images for a face swap operation:

Brand context: {brand_context}

Source face image URL: {request.source_image_url}
Target image URL: {request.target_image_url}

Respond with this exact JSON structure:
{{
  "compatible": true/false,
  "confidence": 0.0-1.0,
  "recommendations": ["recommendation 1", "recommendation 2"],
  "parameters": {{
    "face_detection_threshold": 0.5,
    "blend_ratio": 0.7,
    "color_correction": true,
    "preserve_background": true,
    "output_format": "png"
  }}
}}"""},
    ]

    try:
        result = await llm.chat_json(messages)
        params = result.get("parameters", {})
        return FaceSwapAnalyzeResponse(
            compatible=bool(result.get("compatible", True)),
            confidence=float(result.get("confidence", 0.7)),
            recommendations=result.get("recommendations", []),
            parameters={
                "face_detection_threshold": float(params.get("face_detection_threshold", 0.5)),
                "blend_ratio": float(params.get("blend_ratio", 0.7)),
                "color_correction": bool(params.get("color_correction", True)),
                "preserve_background": bool(params.get("preserve_background", True)),
                "output_format": str(params.get("output_format", "png")),
            },
        )
    except Exception as e:
        logger.warning("Face swap analysis failed: %s", e)
        return FaceSwapAnalyzeResponse(
            compatible=True,
            confidence=0.5,
            recommendations=["Using default parameters. Manual verification recommended."],
            parameters={
                "face_detection_threshold": 0.5,
                "blend_ratio": 0.7,
                "color_correction": True,
                "preserve_background": True,
                "output_format": "png",
            },
        )
