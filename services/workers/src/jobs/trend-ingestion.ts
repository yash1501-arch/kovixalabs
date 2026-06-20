import pino from "pino";
import { env } from "../config.js";
import type { Job } from "../queues/job-queue.js";

const logger = pino({ level: env.nodeEnv === "test" ? "silent" : "info" });

interface TrendIngestionJobData {
  workspaceId: string;
  source?: string;
}

export async function handleTrendIngestionJob(job: Job<TrendIngestionJobData>): Promise<void> {
  const { workspaceId, source } = job.data;

  logger.info({ workspaceId, source }, "Processing trend ingestion job");

  // Call the AI service to analyze trends
  const response = await fetch(`${env.aiServiceUrl}/generate/trends`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspace_id: workspaceId }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Trend ingestion API returned ${response.status}: ${body}`);
  }

  const trends = await response.json();

  // Store trends via the API
  const storeResponse = await fetch(`${env.apiUrl}/v1/workspaces/${workspaceId}/trends/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trends }),
  });

  if (!storeResponse.ok) {
    const body = await storeResponse.text();
    throw new Error(`Trend storage API returned ${storeResponse.status}: ${body}`);
  }

  logger.info({ workspaceId, count: Array.isArray(trends) ? trends.length : 0 }, "Trends ingested successfully");
}
