import { Router, type RequestHandler } from "express";
import { requireWorkspaceAuth } from "../middleware/rbac.js";
import * as webhookController from "../controllers/webhook-controller.js";
import * as webhookService from "../services/webhook-service.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const webhookRouter = Router();

webhookRouter.get("/workspaces/:workspaceId/webhooks", ...requireWorkspaceAuth(), asyncRoute(webhookController.index));
webhookRouter.get("/workspaces/:workspaceId/webhooks/:webhookId", ...requireWorkspaceAuth(), asyncRoute(webhookController.show));
webhookRouter.post("/workspaces/:workspaceId/webhooks", ...requireWorkspaceAuth(), asyncRoute(webhookController.create));
webhookRouter.patch("/workspaces/:workspaceId/webhooks/:webhookId", ...requireWorkspaceAuth(), asyncRoute(webhookController.update));
webhookRouter.delete("/workspaces/:workspaceId/webhooks/:webhookId", ...requireWorkspaceAuth(), asyncRoute(webhookController.remove));

webhookRouter.post("/workspaces/:workspaceId/webhooks/:webhookId/test", ...requireWorkspaceAuth(), asyncRoute(async (req, res) => {
  const workspaceId = req.params.workspaceId as string;
  const webhookId = req.params.webhookId as string;
  const wh = await webhookService.getWebhook(webhookId, workspaceId);
  if (!wh) { res.status(404).json({ error: "not_found", message: "Webhook not found" }); return; }
  const result = await webhookService.testWebhook(wh as any);
  res.json(result);
}));
