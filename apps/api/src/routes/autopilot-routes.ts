import { Router, type RequestHandler } from "express";
import { listAutopilotConfigsHandler, upsertAutopilotConfigHandler, updateAutopilotConfigHandler, runAutopilotHandler, listAutopilotRunsHandler } from "../controllers/autopilot-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const autopilotRouter = Router();

autopilotRouter.get("/workspaces/:workspaceId/autopilot", ...requireWorkspaceAuth(), asyncRoute(listAutopilotConfigsHandler));
autopilotRouter.post("/workspaces/:workspaceId/autopilot", ...requireWorkspaceAuth(), asyncRoute(upsertAutopilotConfigHandler));
autopilotRouter.patch("/workspaces/:workspaceId/autopilot/:configId", ...requireWorkspaceAuth(), asyncRoute(updateAutopilotConfigHandler));
autopilotRouter.post("/workspaces/:workspaceId/autopilot/:configId/run", ...requireWorkspaceAuth(), asyncRoute(runAutopilotHandler));
autopilotRouter.get("/workspaces/:workspaceId/autopilot/:configId/runs", ...requireWorkspaceAuth(), asyncRoute(listAutopilotRunsHandler));
