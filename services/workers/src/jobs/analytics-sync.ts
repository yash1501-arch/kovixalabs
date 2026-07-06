import pino from "pino";
import { env } from "../config.js";
import type { Job } from "../queues/job-queue.js";

const logger = pino({ level: env.nodeEnv === "test" ? "silent" : "info" });

interface AnalyticsSyncJobData {
  workspaceId: string;
}

export async function handleAnalyticsSyncJob(job: Job<AnalyticsSyncJobData>): Promise<void> {
  const { workspaceId } = job.data;

  logger.info({ workspaceId }, "Processing analytics sync job");

  const response = await fetch(`${env.apiUrl}/api/internal/analytics/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Analytics sync API returned ${response.status}: ${body}`);
  }

  logger.info({ workspaceId }, "Analytics synced successfully");
}
