import pino from "pino";
import { env } from "../config.js";

const logger = pino({ level: env.nodeEnv === "test" ? "silent" : "info" });

type ScheduledTask = () => Promise<void>;

interface ScheduledJob {
  name: string;
  intervalMs: number;
  task: ScheduledTask;
  lastRun: number;
}

export class Scheduler {
  private jobs: ScheduledJob[] = [];
  private timers: NodeJS.Timeout[] = [];

  add(name: string, intervalMs: number, task: ScheduledTask): void {
    this.jobs.push({ name, intervalMs, task, lastRun: 0 });
    logger.info({ name, intervalMs }, "Scheduled job registered");
  }

  start(): void {
    for (const job of this.jobs) {
      this.runJob(job);
      const timer = setInterval(() => this.runJob(job), job.intervalMs);
      this.timers.push(timer);
    }
    logger.info({ count: this.jobs.length }, "Scheduler started");
  }

  stop(): void {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers = [];
    logger.info("Scheduler stopped");
  }

  private async runJob(job: ScheduledJob): Promise<void> {
    try {
      job.lastRun = Date.now();
      await job.task();
    } catch (err) {
      logger.error({ err, name: job.name }, "Scheduled job failed");
    }
  }
}
