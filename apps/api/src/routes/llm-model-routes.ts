import { Router, type RequestHandler } from "express";
import { index, show, create, update, remove, testConnection } from "../controllers/llm-model-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const llmModelRouter = Router();

llmModelRouter.get("/workspaces/:workspaceId/llm-models", ...requireWorkspaceAuth(), asyncRoute(index));
llmModelRouter.get("/workspaces/:workspaceId/llm-models/:modelId", ...requireWorkspaceAuth(), asyncRoute(show));
llmModelRouter.post("/workspaces/:workspaceId/llm-models", ...requireWorkspaceAuth(), asyncRoute(create));
llmModelRouter.patch("/workspaces/:workspaceId/llm-models/:modelId", ...requireWorkspaceAuth(), asyncRoute(update));
llmModelRouter.delete("/workspaces/:workspaceId/llm-models/:modelId", ...requireWorkspaceAuth(), asyncRoute(remove));
llmModelRouter.post("/workspaces/:workspaceId/llm-models/:modelId/test", ...requireWorkspaceAuth(), asyncRoute(testConnection));
