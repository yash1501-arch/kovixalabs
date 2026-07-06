import { Router, type RequestHandler } from "express";
import { prisma } from "../db.js";
import { env } from "../config.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const healthRouter = Router();

healthRouter.get("/health", asyncRoute(async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    const aiResp = await fetch(`${env.aiServiceUrl}/health`, { signal: AbortSignal.timeout(5000) });
    checks.ai_service = aiResp.ok ? "ok" : `error (${aiResp.status})`;
  } catch {
    checks.ai_service = "unreachable";
  }

  const allOk = Object.values(checks).every(v => v === "ok");

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  });
}));
