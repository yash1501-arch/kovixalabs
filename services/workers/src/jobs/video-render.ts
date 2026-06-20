import pino from "pino";
import { env } from "../config.js";
import type { Job } from "../queues/job-queue.js";

const logger = pino({ level: env.nodeEnv === "test" ? "silent" : "info" });

interface VideoRenderJobData {
  taskId: string;
  workspaceId: string;
  brandId: string;
  title: string;
  scenes: Array<{
    sceneNumber: number;
    durationSeconds: number;
    visualDescription: string;
    spokenText: string;
    onScreenText?: string;
  }>;
  cta: string;
  hashtags: string[];
  backgroundMusicUrl?: string;
}

export async function handleVideoRenderJob(job: Job<VideoRenderJobData>): Promise<void> {
  const { taskId, workspaceId, title, scenes } = job.data;

  logger.info({ taskId, workspaceId, title, sceneCount: scenes.length }, "Processing video render job");

  const response = await fetch(`${env.aiServiceUrl}/generate/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspace_id: workspaceId,
      brand_id: job.data.brandId,
      title,
      scenes: scenes.map((s) => ({
        scene_number: s.sceneNumber,
        duration_seconds: s.durationSeconds,
        visual_description: s.visualDescription,
        spoken_text: s.spokenText,
        on_screen_text: s.onScreenText,
      })),
      cta: job.data.cta,
      hashtags: job.data.hashtags,
      background_music_url: job.data.backgroundMusicUrl,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Video render API returned ${response.status}: ${body}`);
  }

  const result = await response.json() as { status: string; video_url?: string; error?: string };

  if (result.status === "rendered" && result.video_url) {
    logger.info({ taskId, videoUrl: result.video_url }, "Video rendered successfully");

    if (job.data.workspaceId && scenes.length > 0) {
      try {
        const platform = "tiktok";
        const caption = `${title}\n\n${scenes.map((s) => s.spokenText).join(" ")}\n\n${job.data.cta}\n${job.data.hashtags.map((h) => `#${h}`).join(" ")}`;

        const publishResponse = await fetch(`${env.apiUrl}/api/internal/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: taskId,
            workspaceId: job.data.workspaceId,
            platform,
            caption,
            mediaUrls: [result.video_url],
          }),
        });

        if (!publishResponse.ok) {
          logger.warn({ taskId, status: publishResponse.status }, "Auto-publish triggered but may need post creation");
        }
      } catch (err) {
        logger.warn({ err, taskId }, "Auto-publish failed (non-critical)");
      }
    }
  } else {
    logger.error({ taskId, error: result.error }, "Video rendering failed");
    throw new Error(result.error || "Video rendering failed");
  }
}
