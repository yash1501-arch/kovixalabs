import { createClient, type RedisClientType } from "redis";
import pino from "pino";
import { env } from "../config.js";

const logger = pino({ level: env.nodeEnv === "test" ? "silent" : "info" });

let client: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (client?.isOpen) return client;

  client = createClient({
    url: env.redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          logger.error("Redis connection failed after 3 retries — giving up");
          return false;
        }
        return Math.min(retries * 200, 1000);
      },
      connectTimeout: 5000,
    },
  });

  client.on("error", (err) => {
    logger.error({ err }, "Redis client error");
  });

  client.on("connect", () => {
    logger.info("Connected to Redis");
  });

  await client.connect();
  return client;
}

export async function closeRedisClient(): Promise<void> {
  if (client?.isOpen) {
    await client.quit();
    client = null;
    logger.info("Redis client disconnected");
  }
}
