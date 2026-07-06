import { Router, type RequestHandler } from "express";
import { index, create, show, update, destroy, generateScript } from "../controllers/video-project-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const videoProjectRouter = Router();

videoProjectRouter.get("/workspaces/:workspaceId/video-projects", ...requireWorkspaceAuth(), asyncRoute(index));
videoProjectRouter.post("/workspaces/:workspaceId/video-projects", ...requireWorkspaceAuth(), asyncRoute(create));
videoProjectRouter.get("/workspaces/:workspaceId/video-projects/:projectId", ...requireWorkspaceAuth(), asyncRoute(show));
videoProjectRouter.patch("/workspaces/:workspaceId/video-projects/:projectId", ...requireWorkspaceAuth(), asyncRoute(update));
videoProjectRouter.delete("/workspaces/:workspaceId/video-projects/:projectId", ...requireWorkspaceAuth(), asyncRoute(destroy));
videoProjectRouter.post("/workspaces/:workspaceId/video-projects/:projectId/generate-script", ...requireWorkspaceAuth(), asyncRoute(generateScript));
