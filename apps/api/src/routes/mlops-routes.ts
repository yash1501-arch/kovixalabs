import { Router, type RequestHandler } from "express";
import { listMlopsModels, promoteMlopsModel, listExperiments, createExperiment } from "../controllers/mlops-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const mlopsRouter = Router();

mlopsRouter.get("/workspaces/:workspaceId/mlops/models", optionalAuth, asyncRoute(listMlopsModels));
mlopsRouter.post("/workspaces/:workspaceId/mlops/models/:modelId/promote", requireAuth, asyncRoute(promoteMlopsModel));
mlopsRouter.get("/workspaces/:workspaceId/mlops/experiments", optionalAuth, asyncRoute(listExperiments));
mlopsRouter.post("/workspaces/:workspaceId/mlops/experiments", requireAuth, asyncRoute(createExperiment));
