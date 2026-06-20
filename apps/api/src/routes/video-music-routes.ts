import { Router, type RequestHandler } from "express";
import { generateVideoScript, listVideoScripts, deleteVideoScript, suggestMusic, listMusicSuggestions, deleteMusicSuggestion } from "../controllers/video-music-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const videoMusicRouter = Router();

videoMusicRouter.post("/brands/:brandId/video/script", requireAuth, asyncRoute(generateVideoScript));
videoMusicRouter.get("/workspaces/:workspaceId/video-scripts", optionalAuth, asyncRoute(listVideoScripts));
videoMusicRouter.delete("/workspaces/:workspaceId/video-scripts/:scriptId", requireAuth, asyncRoute(deleteVideoScript));
videoMusicRouter.post("/brands/:brandId/music/suggest", requireAuth, asyncRoute(suggestMusic));
videoMusicRouter.get("/workspaces/:workspaceId/music-suggestions", optionalAuth, asyncRoute(listMusicSuggestions));
videoMusicRouter.delete("/workspaces/:workspaceId/music-suggestions/:suggestionId", requireAuth, asyncRoute(deleteMusicSuggestion));
