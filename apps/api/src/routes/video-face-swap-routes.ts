import { Router, type RequestHandler } from "express";
import { index, create, show, update, destroy } from "../controllers/video-face-swap-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const videoFaceSwapRouter = Router();

videoFaceSwapRouter.get("/workspaces/:workspaceId/video-face-swap-jobs", ...requireWorkspaceAuth(), asyncRoute(index));
videoFaceSwapRouter.post("/workspaces/:workspaceId/video-face-swap-jobs", ...requireWorkspaceAuth(), asyncRoute(create));
videoFaceSwapRouter.get("/workspaces/:workspaceId/video-face-swap-jobs/:jobId", ...requireWorkspaceAuth(), asyncRoute(show));
videoFaceSwapRouter.patch("/workspaces/:workspaceId/video-face-swap-jobs/:jobId", ...requireWorkspaceAuth(), asyncRoute(update));
videoFaceSwapRouter.delete("/workspaces/:workspaceId/video-face-swap-jobs/:jobId", ...requireWorkspaceAuth(), asyncRoute(destroy));
