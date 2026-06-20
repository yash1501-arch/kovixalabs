import { Router, type RequestHandler } from "express";
import {
  workspaceAnalytics, dashboardStats, listTrends, refreshTrends,
  listImagePrompts, createImagePrompt, deleteImagePrompt,
} from "../controllers/trend-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const trendRouter = Router();

trendRouter.get("/workspaces/:workspaceId/analytics", optionalAuth, asyncRoute(workspaceAnalytics));
trendRouter.get("/workspaces/:workspaceId/stats", optionalAuth, asyncRoute(dashboardStats));
trendRouter.get("/workspaces/:workspaceId/trends", optionalAuth, asyncRoute(listTrends));
trendRouter.post("/workspaces/:workspaceId/trends/refresh", requireAuth, asyncRoute(refreshTrends));
trendRouter.get("/workspaces/:workspaceId/image-prompts", optionalAuth, asyncRoute(listImagePrompts));
trendRouter.post("/brands/:brandId/images/prompt", requireAuth, asyncRoute(createImagePrompt));
trendRouter.delete("/workspaces/:workspaceId/image-prompts/:promptId", requireAuth, asyncRoute(deleteImagePrompt));
