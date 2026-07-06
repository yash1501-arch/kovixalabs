import { Router, type RequestHandler } from "express";
import { uploadFromUrl } from "../controllers/upload-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const uploadRouter = Router();

uploadRouter.post("/workspaces/:workspaceId/upload/url", ...requireWorkspaceAuth(), asyncRoute(uploadFromUrl));
