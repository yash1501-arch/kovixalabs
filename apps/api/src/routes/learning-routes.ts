import { Router, type RequestHandler } from "express";
import { listLearningInsightsHandler, analyzeLearningHandler, loadLearningProfileHandler } from "../controllers/learning-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const learningRouter = Router();

learningRouter.get("/workspaces/:workspaceId/learning/insights", optionalAuth, asyncRoute(listLearningInsightsHandler));
learningRouter.post("/workspaces/:workspaceId/learning/analyze", requireAuth, asyncRoute(analyzeLearningHandler));
learningRouter.get("/workspaces/:workspaceId/learning/profile", optionalAuth, asyncRoute(loadLearningProfileHandler));
