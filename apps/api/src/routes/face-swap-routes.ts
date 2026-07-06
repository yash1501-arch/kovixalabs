import { Router, type RequestHandler } from "express";
import { index, create, show, update, destroy } from "../controllers/face-swap-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const faceSwapRouter = Router();

faceSwapRouter.get("/workspaces/:workspaceId/face-swap-jobs", ...requireWorkspaceAuth(), asyncRoute(index));
faceSwapRouter.post("/workspaces/:workspaceId/face-swap-jobs", ...requireWorkspaceAuth(), asyncRoute(create));
faceSwapRouter.get("/workspaces/:workspaceId/face-swap-jobs/:jobId", ...requireWorkspaceAuth(), asyncRoute(show));
faceSwapRouter.patch("/workspaces/:workspaceId/face-swap-jobs/:jobId", ...requireWorkspaceAuth(), asyncRoute(update));
faceSwapRouter.delete("/workspaces/:workspaceId/face-swap-jobs/:jobId", ...requireWorkspaceAuth(), asyncRoute(destroy));
