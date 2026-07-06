import { Router, type RequestHandler } from "express";
import { generate } from "../controllers/image-gen-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const imageGenRouter = Router();

imageGenRouter.post("/workspaces/:workspaceId/generate/images", ...requireWorkspaceAuth(), asyncRoute(generate));
