import pino from "pino";
import { createApp } from "./app.js";
import { env } from "./config.js";
import { startMetaTokenRefreshJob } from "./jobs/token-refresh.js";
import { publishPost } from "./services/post-service.js";

const logger = pino({
  level: env.nodeEnv === "test" ? "silent" : "info",
});

function startBackgroundPublisher(): void {
  logger.info("Initializing background scheduled post publisher...");
  setInterval(async () => {
    try {
      const { prisma } = await import("./db.js");
      const now = new Date();
      const posts = await prisma.post.findMany({
        where: { status: "SCHEDULED", scheduledAt: { lte: now } },
        select: { id: true, workspaceId: true, platform: true },
      });
      for (const post of posts) {
        logger.info({ postId: post.id, platform: post.platform }, "Auto-publishing scheduled post");
        publishPost(post.workspaceId, post.id).catch((err) => {
          logger.error({ err, postId: post.id }, "Background publish failed");
        });
      }
    } catch (error) {
      logger.error({ error }, "Background publish tick failed");
    }
  }, 60_000);
}

const app = createApp();

app.listen(env.port, () => {
  logger.info({ port: env.port }, "AISMOS API listening");
  startMetaTokenRefreshJob(logger);
  startBackgroundPublisher();
});
