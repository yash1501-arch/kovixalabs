import { Router, type RequestHandler } from "express";
import { listActivity } from "../controllers/activity-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const activityRouter = Router();

activityRouter.get("/workspaces/:workspaceId/activity", ...requireWorkspaceAuth(), asyncRoute(listActivity));
