import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../utils/api-error.js";
import { listSwarmTasks as listSvc, dispatchSwarmTask as dispatchSvc, listSwarmAgents as listAgentsSvc } from "../services/swarm-service.js";
import { prisma } from "../db.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const TaskParams = z.object({ taskId: z.string().min(1) });

const DispatchBody = z.object({
  type: z.enum(["content_week", "trend_analysis", "campaign_create", "brand_audit", "hashtag_refresh"]),
  brandId: z.string().min(1),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  input: z.record(z.string(), z.unknown()).default({}),
});

export async function listSwarmTasks(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const tasks = await listSvc(workspaceId);
  response.json(tasks);
}

export async function dispatchSwarm(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const body = DispatchBody.parse(request.body);
  const brand = await prisma.brand.findUnique({ where: { id: body.brandId } });
  const brandName = brand?.name ?? "Brand";

  const result = await dispatchSvc({ workspaceId, brandName, ...body });
  response.status(201).json(result);
}

export async function listSwarmAgents(request: Request, response: Response) {
  const { workspaceId, taskId } = { ...WorkspaceParams.parse(request.params), ...TaskParams.parse(request.params) };
  const agents = await listAgentsSvc(taskId, workspaceId);
  response.json(agents);
}
