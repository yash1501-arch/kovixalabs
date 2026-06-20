import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../utils/api-error.js";
import { listMlopsModels as listModelsSvc, promoteMlopsModel as promoteModelSvc, listExperiments as listExperimentsSvc, createExperiment as createExperimentSvc } from "../services/mlops-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const ModelParams = z.object({ modelId: z.string().min(1) });

export async function listMlopsModels(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const models = await listModelsSvc(workspaceId);
  response.json(models);
}

export async function promoteMlopsModel(request: Request, response: Response) {
  const { workspaceId, modelId } = { ...WorkspaceParams.parse(request.params), ...ModelParams.parse(request.params) };
  const body = z.object({ stage: z.enum(["development", "staging", "production", "archived"]) }).parse(request.body);
  const result = await promoteModelSvc(modelId, workspaceId, body.stage);
  response.json(result);
}

const ExperimentBody = z.object({
  name: z.string().min(1), description: z.string().default(""), metric: z.string().default("accuracy"),
});

export async function listExperiments(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const experiments = await listExperimentsSvc(workspaceId);
  response.json(experiments);
}

export async function createExperiment(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const body = ExperimentBody.parse(request.body);
  const result = await createExperimentSvc({ workspaceId, ...body });
  response.status(201).json(result);
}
