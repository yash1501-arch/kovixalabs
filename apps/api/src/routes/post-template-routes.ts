import { Router, type RequestHandler } from "express";
import { index, show, create, update, remove } from "../controllers/post-template-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const postTemplateRouter = Router();

postTemplateRouter.get("/workspaces/:workspaceId/templates", ...requireWorkspaceAuth(), asyncRoute(index));
postTemplateRouter.get("/workspaces/:workspaceId/templates/:templateId", ...requireWorkspaceAuth(), asyncRoute(show));
postTemplateRouter.post("/workspaces/:workspaceId/templates", ...requireWorkspaceAuth(), asyncRoute(create));
postTemplateRouter.patch("/workspaces/:workspaceId/templates/:templateId", ...requireWorkspaceAuth(), asyncRoute(update));
postTemplateRouter.delete("/workspaces/:workspaceId/templates/:templateId", ...requireWorkspaceAuth(), asyncRoute(remove));
