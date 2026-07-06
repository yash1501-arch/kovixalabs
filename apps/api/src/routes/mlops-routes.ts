import { Router, type RequestHandler } from "express";
import { listMlopsModels, promoteMlopsModel, listExperiments, createExperiment } from "../controllers/mlops-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const mlopsRouter = Router();

mlopsRouter.get("/workspaces/:workspaceId/mlops/models", ...requireWorkspaceAuth(), asyncRoute(listMlopsModels));
mlopsRouter.post("/workspaces/:workspaceId/mlops/models/:modelId/promote", ...requireWorkspaceAuth(), asyncRoute(promoteMlopsModel));
mlopsRouter.get("/workspaces/:workspaceId/mlops/experiments", ...requireWorkspaceAuth(), asyncRoute(listExperiments));
mlopsRouter.post("/workspaces/:workspaceId/mlops/experiments", ...requireWorkspaceAuth(), asyncRoute(createExperiment));
