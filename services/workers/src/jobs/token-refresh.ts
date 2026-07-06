import pino from "pino";
import { env } from "../config.js";
import type { Job } from "../queues/job-queue.js";

const logger = pino({ level: env.nodeEnv === "test" ? "silent" : "info" });

export async function handleTokenRefreshJob(_job: Job<void>): Promise<void> {
  logger.info("Processing token refresh job");

  const response = await fetch(`${env.apiUrl}/api/internal/tokens/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token refresh API returned ${response.status}: ${body}`);
  }

  const result = await response.json() as { meta?: { refreshed: number; failed: number }; youtube?: { refreshed: number; failed: number }; tiktok?: { refreshed: number; failed: number }; twitter?: { refreshed: number; failed: number } };
  logger.info(result, "Tokens refreshed successfully");
}
