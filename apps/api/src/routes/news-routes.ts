import { Router, type RequestHandler } from "express";
import {
  analyze,
  createSource,
  destroySource,
  listArticles,
  listSources,
  scrape,
} from "../controllers/news-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const newsRouter = Router();

newsRouter.get("/workspaces/:workspaceId/news/sources", ...requireWorkspaceAuth(), asyncRoute(listSources));
newsRouter.post("/workspaces/:workspaceId/news/sources", ...requireWorkspaceAuth(), asyncRoute(createSource));
newsRouter.delete("/workspaces/:workspaceId/news/sources/:sourceId", ...requireWorkspaceAuth(), asyncRoute(destroySource));
newsRouter.get("/workspaces/:workspaceId/news/articles", ...requireWorkspaceAuth(), asyncRoute(listArticles));
newsRouter.post("/workspaces/:workspaceId/news/sources/:sourceId/scrape", ...requireWorkspaceAuth(), asyncRoute(scrape));
newsRouter.post("/workspaces/:workspaceId/news/analyze", ...requireWorkspaceAuth(), asyncRoute(analyze));
