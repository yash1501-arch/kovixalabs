import { Router, type RequestHandler } from "express";
import { index, create, listItems, updateItemStatus, remove } from "../controllers/content-plan-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const contentPlanRouter = Router();

contentPlanRouter.get("/workspaces/:workspaceId/content-plans", optionalAuth, asyncRoute(index));
contentPlanRouter.post("/workspaces/:workspaceId/content-plans", requireAuth, asyncRoute(create));
contentPlanRouter.get("/workspaces/:workspaceId/content-plans/:planId/items", optionalAuth, asyncRoute(listItems));
contentPlanRouter.patch("/workspaces/:workspaceId/content-plans/:planId/items/:itemId/status", requireAuth, asyncRoute(updateItemStatus));
contentPlanRouter.delete("/workspaces/:workspaceId/content-plans/:planId", requireAuth, asyncRoute(remove));
