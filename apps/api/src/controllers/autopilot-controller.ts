import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../utils/api-error.js";
import { listConfigs, upsertConfig, updateConfig, runConfig, listRuns } from "../services/autopilot-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const ConfigParams = z.object({ configId: z.string().min(1) });

const UpsertConfigBody = z.object({
  brandId: z.string().min(1),
  platforms: z.array(z.enum(["instagram", "linkedin", "x", "facebook", "tiktok", "youtube"])).min(1),
  postsPerWeek: z.number().int().min(1).max(21),
  preferredTimes: z.array(z.string()).default([]),
  contentStyle: z.enum(["educational", "entertaining", "promotional", "mixed"]).default("mixed"),
  topicPreferences: z.array(z.string()).default([]),
});

const UpdateConfigBody = z.object({ enabled: z.boolean() });

export async function listAutopilotConfigsHandler(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const configs = await listConfigs(workspaceId);
  response.json(configs);
}

export async function upsertAutopilotConfigHandler(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const body = UpsertConfigBody.parse(request.body);
  const result = await upsertConfig({ workspaceId, ...body });
  response.status(result.createdAt.getTime() === result.updatedAt.getTime() ? 201 : 200).json(result);
}

export async function updateAutopilotConfigHandler(request: Request, response: Response) {
  const { workspaceId, configId } = { ...WorkspaceParams.parse(request.params), ...ConfigParams.parse(request.params) };
  const body = UpdateConfigBody.parse(request.body);
  const result = await updateConfig(configId, workspaceId, body.enabled);
  response.json(result);
}

export async function runAutopilotHandler(request: Request, response: Response) {
  const { workspaceId, configId } = { ...WorkspaceParams.parse(request.params), ...ConfigParams.parse(request.params) };
  const result = await runConfig(configId, workspaceId);
  response.status(201).json(result);
}

export async function listAutopilotRunsHandler(request: Request, response: Response) {
  const { workspaceId, configId } = { ...WorkspaceParams.parse(request.params), ...ConfigParams.parse(request.params) };
  const runs = await listRuns(configId, workspaceId);
  response.json(runs);
}
