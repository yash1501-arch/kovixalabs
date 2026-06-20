import dotenv from "dotenv";

dotenv.config();

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Environment variable ${name} must be a number.`);
  return value;
}

function readString(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: readString("NODE_ENV", "development"),
  redisUrl: readString("REDIS_URL", "redis://localhost:6379"),
  apiUrl: readString("API_URL", "http://localhost:4000"),
  aiServiceUrl: readString("AI_SERVICE_URL", "http://localhost:8000"),
  qdrantUrl: readString("QDRANT_URL", "http://localhost:6333"),
  databaseUrl: readString("DATABASE_URL", "postgresql://aismos:aismos@localhost:5432/aismos?schema=public"),

  // Worker concurrency
  publishConcurrency: readNumber("WORKER_PUBLISH_CONCURRENCY", 3),
  trendConcurrency: readNumber("WORKER_TREND_CONCURRENCY", 1),
  analyticsConcurrency: readNumber("WORKER_ANALYTICS_CONCURRENCY", 1),

  // Schedules (ms)
  publishIntervalMs: readNumber("PUBLISH_INTERVAL_MS", 60_000),
  trendIngestionIntervalMs: readNumber("TREND_INGESTION_INTERVAL_MS", 300_000),
  analyticsSyncIntervalMs: readNumber("ANALYTICS_SYNC_INTERVAL_MS", 600_000),
  tokenRefreshIntervalMs: readNumber("TOKEN_REFRESH_INTERVAL_MS", 43_200_000),
};
