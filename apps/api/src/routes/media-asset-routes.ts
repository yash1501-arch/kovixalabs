import { Router, type RequestHandler } from "express";
import { index, create, show, update, destroy } from "../controllers/media-asset-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const mediaAssetRouter = Router();

mediaAssetRouter.get("/workspaces/:workspaceId/media-assets", ...requireWorkspaceAuth(), asyncRoute(index));
mediaAssetRouter.post("/workspaces/:workspaceId/media-assets", ...requireWorkspaceAuth(), asyncRoute(create));
mediaAssetRouter.get("/workspaces/:workspaceId/media-assets/:assetId", ...requireWorkspaceAuth(), asyncRoute(show));
mediaAssetRouter.patch("/workspaces/:workspaceId/media-assets/:assetId", ...requireWorkspaceAuth(), asyncRoute(update));
mediaAssetRouter.delete("/workspaces/:workspaceId/media-assets/:assetId", ...requireWorkspaceAuth(), asyncRoute(destroy));
