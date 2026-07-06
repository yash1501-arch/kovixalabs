import { Router, type RequestHandler } from "express";
import { index, create, listItems, updateItemStatus, remove } from "../controllers/content-plan-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const contentPlanRouter = Router();

contentPlanRouter.get("/workspaces/:workspaceId/content-plans", ...requireWorkspaceAuth(), asyncRoute(index));
contentPlanRouter.post("/workspaces/:workspaceId/content-plans", ...requireWorkspaceAuth(), asyncRoute(create));
contentPlanRouter.get("/workspaces/:workspaceId/content-plans/:planId/items", ...requireWorkspaceAuth(), asyncRoute(listItems));
contentPlanRouter.patch("/workspaces/:workspaceId/content-plans/:planId/items/:itemId/status", ...requireWorkspaceAuth(), asyncRoute(updateItemStatus));
contentPlanRouter.delete("/workspaces/:workspaceId/content-plans/:planId", ...requireWorkspaceAuth(), asyncRoute(remove));
