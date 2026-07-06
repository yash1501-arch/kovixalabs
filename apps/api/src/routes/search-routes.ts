import { Router, type RequestHandler } from "express";
import { search } from "../controllers/search-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const searchRouter = Router();

searchRouter.get("/workspaces/:workspaceId/search", ...requireWorkspaceAuth(), asyncRoute(search));
