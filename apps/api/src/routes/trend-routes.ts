import { Router, type RequestHandler } from "express";
import {
  workspaceAnalytics, dashboardStats, listTrends, refreshTrends,
  listImagePrompts, createImagePrompt, deleteImagePrompt,
} from "../controllers/trend-controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const trendRouter = Router();

trendRouter.get("/workspaces/:workspaceId/analytics", ...requireWorkspaceAuth(), asyncRoute(workspaceAnalytics));
trendRouter.get("/workspaces/:workspaceId/stats", ...requireWorkspaceAuth(), asyncRoute(dashboardStats));
trendRouter.get("/workspaces/:workspaceId/trends", ...requireWorkspaceAuth(), asyncRoute(listTrends));
trendRouter.post("/workspaces/:workspaceId/trends/refresh", ...requireWorkspaceAuth(), asyncRoute(refreshTrends));
trendRouter.get("/workspaces/:workspaceId/image-prompts", ...requireWorkspaceAuth(), asyncRoute(listImagePrompts));
trendRouter.post("/brands/:brandId/images/prompt", requireAuth, asyncRoute(createImagePrompt));
trendRouter.delete("/workspaces/:workspaceId/image-prompts/:promptId", ...requireWorkspaceAuth(), asyncRoute(deleteImagePrompt));
