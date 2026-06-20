import { Router, type RequestHandler } from "express";
import {
  workspaceStats,
  brandPerformance,
  brandEngagement,
  hashtagResearch,
  hashtagRecharge,
} from "../controllers/analytics-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const analyticsRouter = Router();

analyticsRouter.get("/workspaces/:workspaceId/stats", optionalAuth, asyncRoute(workspaceStats));
analyticsRouter.get("/brands/:brandId/performance", optionalAuth, asyncRoute(brandPerformance));
analyticsRouter.get("/brands/:brandId/engagement", optionalAuth, asyncRoute(brandEngagement));
analyticsRouter.post("/brands/:brandId/research/hashtags", requireAuth, asyncRoute(hashtagResearch));
analyticsRouter.post("/brands/:brandId/research/hashtags/recharge", requireAuth, asyncRoute(hashtagRecharge));
