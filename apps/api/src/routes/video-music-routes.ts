import { Router, type RequestHandler } from "express";
import { generateVideoScript, listVideoScripts, deleteVideoScript, suggestMusic, listMusicSuggestions, deleteMusicSuggestion } from "../controllers/video-music-controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const videoMusicRouter = Router();

videoMusicRouter.post("/brands/:brandId/video/script", requireAuth, asyncRoute(generateVideoScript));
videoMusicRouter.get("/workspaces/:workspaceId/video-scripts", ...requireWorkspaceAuth(), asyncRoute(listVideoScripts));
videoMusicRouter.delete("/workspaces/:workspaceId/video-scripts/:scriptId", ...requireWorkspaceAuth(), asyncRoute(deleteVideoScript));
videoMusicRouter.post("/brands/:brandId/music/suggest", requireAuth, asyncRoute(suggestMusic));
videoMusicRouter.get("/workspaces/:workspaceId/music-suggestions", ...requireWorkspaceAuth(), asyncRoute(listMusicSuggestions));
videoMusicRouter.delete("/workspaces/:workspaceId/music-suggestions/:suggestionId", ...requireWorkspaceAuth(), asyncRoute(deleteMusicSuggestion));
