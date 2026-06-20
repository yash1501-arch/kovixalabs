import dotenv from "dotenv";
import pino from "pino";

import { env } from "./config.js";
import { handlePublishJob } from "./jobs/publishing.js";
import { handleTrendIngestionJob } from "./jobs/trend-ingestion.js";
import { handleVideoRenderJob } from "./jobs/video-render.js";
import { JobQueue, type JobHandler } from "./queues/job-queue.js";
import { closeRedisClient, getRedisClient } from "./queues/redis-client.js";
import { Scheduler } from "./services/scheduler.js";

dotenv.config();

const logger = pino({
  level: env.nodeEnv === "test" ? "silent" : "info",
});

let publishQueue: JobQueue | undefined;

async function checkScheduledPosts(): Promise<void> {
  try {
    const response = await fetch(
      `${env.apiUrl}/api/internal/scheduled-posts`,
      { headers: { "Content-Type": "application/json" } },
    );

    if (!response.ok) {
      logger.warn({ status: response.status }, "Failed to fetch scheduled posts");
      return;
    }

    const posts = await response.json() as Array<{
      id: string;
      workspaceId: string;
      platform: string;
      caption?: string;
      mediaUrls?: string[];
    }>;

    if (posts.length > 0) {
      logger.info({ count: posts.length }, "Enqueuing scheduled posts for publishing");

      for (const post of posts) {
        if (publishQueue) {
          await publishQueue.enqueue("publish", {
            postId: post.id,
            workspaceId: post.workspaceId,
            platform: post.platform,
            caption: post.caption,
            mediaUrls: post.mediaUrls,
          });
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Error checking scheduled posts");
  }
}

async function main(): Promise<void> {
  logger.info({ redisUrl: env.redisUrl, apiUrl: env.apiUrl, aiServiceUrl: env.aiServiceUrl }, "AISMOS Workers starting");

  let redis;
  try {
    redis = await getRedisClient();
  } catch (err) {
    logger.error({ err }, "Failed to connect to Redis — running in degraded mode (scheduler only)");
  }

  let trendQueue: JobQueue | undefined;
  let videoRenderQueue: JobQueue | undefined;

  if (redis) {
    publishQueue = new JobQueue("publishing", redis, handlePublishJob as JobHandler, env.publishConcurrency);
    trendQueue = new JobQueue("trend-ingestion", redis, handleTrendIngestionJob as JobHandler, env.trendConcurrency);
    videoRenderQueue = new JobQueue("video-render", redis, handleVideoRenderJob as JobHandler, 2);

    publishQueue.start();
    trendQueue.start();
    videoRenderQueue.start();
    logger.info("Job queues initialized and started");
  }

  const scheduler = new Scheduler();

  scheduler.add("scheduled-post-check", env.publishIntervalMs, checkScheduledPosts);

  scheduler.add("trend-ingestion-poll", env.trendIngestionIntervalMs, async () => {
    logger.info("Trend ingestion poll cycle");
  });

  scheduler.start();

  const shutdown = async () => {
    logger.info("Shutting down workers...");
    scheduler.stop();

    if (publishQueue) publishQueue.stop();
    if (trendQueue) trendQueue.stop();

    await closeRedisClient();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  logger.info("AISMOS Worker service ready");
}

main().catch((err) => {
  logger.error({ err }, "Fatal worker error");
  process.exit(1);
});
