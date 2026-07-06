import type { Request, Response } from "express";
import { z } from "zod";
import { LlmModelCreateSchema, LlmModelUpdateSchema } from "@kovixalabs/shared";
import {
  listLlmModels,
  getLlmModel,
  createLlmModel,
  updateLlmModel,
  deleteLlmModel,
  testLlmModel,
} from "../services/llm-model-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const ModelParams = z.object({ modelId: z.string().min(1) });

export async function index(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  response.json(await listLlmModels(workspaceId));
}

export async function show(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { modelId } = ModelParams.parse(request.params);
  response.json(await getLlmModel(workspaceId, modelId));
}

export async function create(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const input = LlmModelCreateSchema.parse(request.body);
  response.status(201).json(await createLlmModel(workspaceId, input));
}

export async function update(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { modelId } = ModelParams.parse(request.params);
  const input = LlmModelUpdateSchema.parse(request.body);
  response.json(await updateLlmModel(workspaceId, modelId, input));
}

export async function remove(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { modelId } = ModelParams.parse(request.params);
  await deleteLlmModel(workspaceId, modelId);
  response.status(204).send();
}

export async function testConnection(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { modelId } = ModelParams.parse(request.params);
  response.json(await testLlmModel(workspaceId, modelId));
}
