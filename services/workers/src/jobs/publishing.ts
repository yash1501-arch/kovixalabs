import pino from "pino";
import { env } from "../config.js";
import type { Job } from "../queues/job-queue.js";

const logger = pino({ level: env.nodeEnv === "test" ? "silent" : "info" });

interface PublishJobData {
  postId: string;
  workspaceId: string;
  platform: string;
  caption?: string;
  mediaUrls?: string[];
  accessToken?: string;
  pageAccessToken?: string;
}

export async function handlePublishJob(job: Job<PublishJobData>): Promise<void> {
  const { postId, workspaceId, platform } = job.data;

  logger.info({ postId, workspaceId, platform }, "Processing publish job");

  // Call the API to publish
  const response = await fetch(`${env.apiUrl}/api/internal/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job.data),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Publishing API returned ${response.status}: ${body}`);
  }

  logger.info({ postId, platform }, "Post published successfully");
}
