import express, { type RequestHandler } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import rateLimit from "express-rate-limit";
import { env } from "./config.js";
import { logger } from "./logger.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { socialRouter } from "./routes/social-routes.js";
import { authRouter } from "./routes/auth-routes.js";
import { brandRouter } from "./routes/brand-routes.js";
import { postRouter } from "./routes/post-routes.js";
import { contentPlanRouter } from "./routes/content-plan-routes.js";
import { trendRouter } from "./routes/trend-routes.js";
import { campaignRouter } from "./routes/campaign-routes.js";
import { videoMusicRouter } from "./routes/video-music-routes.js";
import { swarmRouter } from "./routes/swarm-routes.js";
import { autopilotRouter } from "./routes/autopilot-routes.js";
import { learningRouter } from "./routes/learning-routes.js";
import { finetuneRouter } from "./routes/finetune-routes.js";
import { mlopsRouter } from "./routes/mlops-routes.js";
import { enterpriseRouter } from "./routes/enterprise-routes.js";
import { analyticsRouter } from "./routes/analytics-routes.js";
import { auditRouter } from "./routes/audit-routes.js";
import { copyRouter } from "./routes/copy-routes.js";
import { internalRouter } from "./routes/internal-routes.js";
import { globalErrorHandler } from "./middleware/error-handler.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "2mb" }));
  app.use(cors({ origin: env.corsOrigin }));
  app.use(requestIdMiddleware);
  app.use(pinoHttp({
    logger,
    customProps: (req) => ({ requestId: (req as any).requestId }),
  }));

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false,
    message: { success: false, error: "rate_limit_exceeded", message: "Too many requests, please try again later." },
  });
  app.use("/v1", apiLimiter);

  app.use("/api/internal", internalRouter);

  app.use("/api", apiLimiter);

  app.use("/api/social", socialRouter);
  app.use("/api/auth", authRouter);
  app.use("/api", brandRouter);
  app.use("/api", postRouter);
  app.use("/api", contentPlanRouter);
  app.use("/api", trendRouter);
  app.use("/api", campaignRouter);
  app.use("/api", videoMusicRouter);
  app.use("/api", swarmRouter);
  app.use("/api", autopilotRouter);
  app.use("/api", learningRouter);
  app.use("/api", finetuneRouter);
  app.use("/api", mlopsRouter);
  app.use("/api", enterpriseRouter);
  app.use("/api", analyticsRouter);
  app.use("/api", auditRouter);
  app.use("/api", copyRouter);

  /* ── v1 aliases (frontend uses /v1/...) ── */
  app.use("/v1", socialRouter);
  app.use("/v1/auth", authRouter);
  app.use("/v1", brandRouter);
  app.use("/v1", postRouter);
  app.use("/v1", contentPlanRouter);
  app.use("/v1", trendRouter);
  app.use("/v1", campaignRouter);
  app.use("/v1", videoMusicRouter);
  app.use("/v1", swarmRouter);
  app.use("/v1", autopilotRouter);
  app.use("/v1", learningRouter);
  app.use("/v1", finetuneRouter);
  app.use("/v1", mlopsRouter);
  app.use("/v1", enterpriseRouter);
  app.use("/v1", analyticsRouter);
  app.use("/v1", auditRouter);
  app.use("/v1", copyRouter);

  app.get("/health", asyncRoute(async (_request, response) => {
    response.json({ service: "api", status: "ok", timestamp: new Date().toISOString() });
  }));

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: "not_found",
      message: "Route not found.",
      requestId: req.requestId,
    });
  });

  app.use(globalErrorHandler);

  return app;
}
