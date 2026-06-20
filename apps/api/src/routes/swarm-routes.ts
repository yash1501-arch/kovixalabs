import { Router, type RequestHandler } from "express";
import { listSwarmTasks, dispatchSwarm, listSwarmAgents } from "../controllers/swarm-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const swarmRouter = Router();

swarmRouter.get("/workspaces/:workspaceId/swarm/tasks", optionalAuth, asyncRoute(listSwarmTasks));
swarmRouter.post("/workspaces/:workspaceId/swarm/dispatch", requireAuth, asyncRoute(dispatchSwarm));
swarmRouter.get("/workspaces/:workspaceId/swarm/tasks/:taskId/agents", optionalAuth, asyncRoute(listSwarmAgents));
