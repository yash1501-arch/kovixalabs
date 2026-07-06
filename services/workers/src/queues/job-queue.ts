import { randomUUID } from "node:crypto";
import pino from "pino";
import type { RedisClientType } from "redis";
import { env } from "../config.js";

const logger = pino({ level: env.nodeEnv === "test" ? "silent" : "info" });

export interface Job<T = unknown> {
  id: string;
  type: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
}

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<void>;

export class JobQueue {
  private readonly queueKey: string;
  private readonly processingKey: string;
  private readonly failedKey: string;
  private running = false;

  constructor(
    private readonly name: string,
    private readonly redis: RedisClientType,
    private readonly handler: JobHandler,
    private readonly concurrency: number = 1,
  ) {
    this.queueKey = `queue:${name}`;
    this.processingKey = `queue:${name}:processing`;
    this.failedKey = `queue:${name}:failed`;
  }

  async enqueue<T>(type: string, data: T): Promise<string> {
    const job: Job<T> = {
      id: randomUUID(),
      type,
      data,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    };
    await this.redis.lPush(this.queueKey, JSON.stringify(job));
    logger.info({ jobId: job.id, type, queue: this.name }, "Job enqueued");
    return job.id;
  }

  async enqueueBulk<T>(type: string, items: T[]): Promise<string[]> {
    const ids: string[] = [];
    for (const data of items) {
      ids.push(await this.enqueue(type, data));
    }
    return ids;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    logger.info({ queue: this.name, concurrency: this.concurrency }, "Job queue started");

    for (let i = 0; i < this.concurrency; i++) {
      this.processLoop();
    }
  }

  stop(): void {
    this.running = false;
    logger.info({ queue: this.name }, "Job queue stopped");
  }

  private async processLoop(): Promise<void> {
    while (this.running) {
      try {
        const result = await this.redis.brPop(this.queueKey, 5);
        if (!result) continue;

        const raw = result.element;
        let job: Job;

        try {
          job = JSON.parse(raw) as Job;
        } catch {
          logger.error({ raw }, "Failed to parse job from queue");
          continue;
        }

        await this.processJob(job);
      } catch (err) {
        logger.error({ err, queue: this.name }, "Error in job processing loop");
      }
    }
  }

  private async processJob(job: Job): Promise<void> {
    const startTime = Date.now();

    try {
      await this.handler(job);
      const duration = Date.now() - startTime;
      logger.info({ jobId: job.id, type: job.type, queue: this.name, durationMs: duration }, "Job completed");
    } catch (err) {
      job.attempts++;
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ jobId: job.id, type: job.type, queue: this.name, attempt: job.attempts, error: errorMsg }, "Job failed");

      if (job.attempts < job.maxAttempts) {
        await this.redis.lPush(this.queueKey, JSON.stringify(job));
      } else {
        await this.redis.rPush(this.failedKey, JSON.stringify(job));
        logger.error({ jobId: job.id, type: job.type, queue: this.name }, "Job exhausted all retries — moved to failed queue");
      }
    }
  }
}
