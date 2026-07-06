import type { Request, Response } from "express";
import { z } from "zod";
import * as webhookService from "../services/webhook-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const WebhookParams = z.object({ webhookId: z.string().min(1) });

const WebhookEventEnum = z.enum([
  "POST_PUBLISHED", "POST_SCHEDULED", "POST_FAILED", "POST_DELETED",
  "CAMPAIGN_CREATED", "CAMPAIGN_STATUS_CHANGED",
]);

const CreateWebhookBody = z.object({
  url: z.string().url(),
  events: z.array(WebhookEventEnum).min(1),
  secret: z.string().optional(),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
});

const UpdateWebhookBody = z.object({
  url: z.string().url().optional(),
  events: z.array(WebhookEventEnum).min(1).optional(),
  secret: z.string().optional(),
  enabled: z.boolean().optional(),
  description: z.string().optional(),
});

export async function index(req: Request, res: Response) {
  const { workspaceId } = WorkspaceParams.parse(req.params);
  const webhooks = await webhookService.listWebhooks(workspaceId);
  res.json(webhooks);
}

export async function show(req: Request, res: Response) {
  const { workspaceId, webhookId } = { ...WorkspaceParams.parse(req.params), ...WebhookParams.parse(req.params) };
  const webhook = await webhookService.getWebhook(webhookId, workspaceId);
  if (!webhook) { res.status(404).json({ error: "not_found", message: "Webhook not found" }); return; }
  res.json(webhook);
}

export async function create(req: Request, res: Response) {
  const { workspaceId } = WorkspaceParams.parse(req.params);
  const body = CreateWebhookBody.parse(req.body);
  const webhook = await webhookService.createWebhook({ workspaceId, ...body });
  res.status(201).json(webhook);
}

export async function update(req: Request, res: Response) {
  const { workspaceId, webhookId } = { ...WorkspaceParams.parse(req.params), ...WebhookParams.parse(req.params) };
  const body = UpdateWebhookBody.parse(req.body);
  const webhook = await webhookService.updateWebhook(webhookId, workspaceId, body);
  if (!webhook) { res.status(404).json({ error: "not_found", message: "Webhook not found" }); return; }
  res.json(webhook);
}

export async function remove(req: Request, res: Response) {
  const { workspaceId, webhookId } = { ...WorkspaceParams.parse(req.params), ...WebhookParams.parse(req.params) };
  const deleted = await webhookService.deleteWebhook(webhookId, workspaceId);
  if (!deleted) { res.status(404).json({ error: "not_found", message: "Webhook not found" }); return; }
  res.status(204).send();
}
