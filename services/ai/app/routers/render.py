import asyncio
import json
import logging
import os
import tempfile
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.models.schemas import VideoRenderRequest, VideoRenderResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["render"])


@router.post("/render", response_model=VideoRenderResponse)
async def render_video(request: VideoRenderRequest):
    try:
        task_id = str(uuid4())

        has_ffmpeg = False
        try:
            proc = await asyncio.create_subprocess_exec(
                "ffmpeg", "-version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            has_ffmpeg = proc.returncode == 0
        except FileNotFoundError:
            has_ffmpeg = False

        if not has_ffmpeg:
            logger.warning("FFmpeg not available — returning render plan instead of video")

            render_plan = {
                "task_id": task_id,
                "title": request.title,
                "total_scenes": len(request.scenes),
                "scenes": [],
                "instructions": "FFmpeg not available on server. Install FFmpeg to enable video rendering.",
            }

            total_duration = 0
            for scene in request.scenes:
                scene_plan = {
                    "scene": scene.scene_number,
                    "duration_s": scene.duration_seconds,
                    "visual": scene.visual_description,
                    "text": scene.spoken_text,
                    "on_screen": scene.on_screen_text,
                }
                render_plan["scenes"].append(scene_plan)
                total_duration += scene.duration_seconds

            render_plan["total_duration_s"] = total_duration
            render_plan["cta"] = request.cta
            render_plan["hashtags"] = request.hashtags

            logger.info("Render plan generated (FFmpeg unavailable): %s", task_id)
            return VideoRenderResponse(
                task_id=task_id,
                status="plan_generated",
                video_url=json.dumps(render_plan),
            )

        output_dir = tempfile.mkdtemp(prefix=f"aismos_video_{task_id}_")
        output_path = os.path.join(output_dir, f"{task_id}.mp4")

        scene_files = []
        total_duration = 0

        for i, scene in enumerate(request.scenes):
            scene_dir = os.path.join(output_dir, f"scene_{i}")
            os.makedirs(scene_dir, exist_ok=True)

            image_path = os.path.join(scene_dir, "bg.jpg")
            bg_color = _scene_color(i)
            proc = await asyncio.create_subprocess_exec(
                "ffmpeg", "-y",
                "-f", "lavfi",
                "-i", f"color=c={bg_color}:s=1080x1920:d={scene.duration_seconds}",
                "-vf", f"drawtext=text='{_escape_ffmpeg(scene.visual_description[:80])}':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                image_path,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await proc.wait()

            audio_path = os.path.join(scene_dir, "voice.mp3")
            if scene.spoken_text:
                audio_proc = await asyncio.create_subprocess_exec(
                    "ffmpeg", "-y",
                    "-f", "lavfi",
                    "-i", "anullsrc=r=44100:cl=mono",
                    "-t", str(scene.duration_seconds),
                    "-q:a", "5",
                    audio_path,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                )
                await audio_proc.wait()

            scene_output = os.path.join(scene_dir, "output.mp4")
            video_proc = await asyncio.create_subprocess_exec(
                "ffmpeg", "-y",
                "-loop", "1",
                "-i", image_path,
                "-i", audio_path,
                "-c:v", "libx264",
                "-c:a", "aac",
                "-t", str(scene.duration_seconds),
                "-pix_fmt", "yuv420p",
                "-shortest",
                scene_output,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await video_proc.wait()

            scene_files.append(scene_output)
            total_duration += scene.duration_seconds

        concat_file = os.path.join(output_dir, "concat.txt")
        with open(concat_file, "w") as f:
            for sf in scene_files:
                f.write(f"file '{sf}'\n")

        merge_proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_file,
            "-c:v", "libx264",
            "-c:a", "aac",
            "-pix_fmt", "yuv420p",
            output_path,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await merge_proc.wait()

        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            logger.info("Video rendered: %s (%.1f MB, %.1fs)", task_id, file_size / 1e6, total_duration)
            return VideoRenderResponse(
                task_id=task_id,
                status="rendered",
                video_url=output_path,
            )

        return VideoRenderResponse(
            task_id=task_id,
            status="render_failed",
            error="Output video file not found after FFmpeg processing",
        )

    except Exception as e:
        logger.exception("Video render failed")
        raise HTTPException(status_code=502, detail=str(e)) from e


def _scene_color(index: int) -> str:
    colors = ["0x1a1a2e", "0x16213e", "0x0f3460", "0x533483", "0x3d5a80", "0x293462"]
    return colors[index % len(colors)]


def _escape_ffmpeg(text: str) -> str:
    return text.replace("'", "'\\\\''").replace(":", "\\\\:").replace("%", "\\\\%")
