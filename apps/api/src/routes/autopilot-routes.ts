import { Router, type RequestHandler } from "express";
import { listAutopilotConfigsHandler, upsertAutopilotConfigHandler, updateAutopilotConfigHandler, runAutopilotHandler, listAutopilotRunsHandler } from "../controllers/autopilot-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const autopilotRouter = Router();

autopilotRouter.get("/workspaces/:workspaceId/autopilot", optionalAuth, asyncRoute(listAutopilotConfigsHandler));
autopilotRouter.post("/workspaces/:workspaceId/autopilot", requireAuth, asyncRoute(upsertAutopilotConfigHandler));
autopilotRouter.patch("/workspaces/:workspaceId/autopilot/:configId", requireAuth, asyncRoute(updateAutopilotConfigHandler));
autopilotRouter.post("/workspaces/:workspaceId/autopilot/:configId/run", requireAuth, asyncRoute(runAutopilotHandler));
autopilotRouter.get("/workspaces/:workspaceId/autopilot/:configId/runs", optionalAuth, asyncRoute(listAutopilotRunsHandler));
