import { Router, type RequestHandler } from "express";
import { listLearningInsightsHandler, analyzeLearningHandler, loadLearningProfileHandler } from "../controllers/learning-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const learningRouter = Router();

learningRouter.get("/workspaces/:workspaceId/learning/insights", ...requireWorkspaceAuth(), asyncRoute(listLearningInsightsHandler));
learningRouter.post("/workspaces/:workspaceId/learning/analyze", ...requireWorkspaceAuth(), asyncRoute(analyzeLearningHandler));
learningRouter.get("/workspaces/:workspaceId/learning/profile", ...requireWorkspaceAuth(), asyncRoute(loadLearningProfileHandler));
