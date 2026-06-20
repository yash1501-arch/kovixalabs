import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../utils/api-error.js";
import { listDatasets as listDatasetsSvc, createDataset as createDatasetSvc, deleteDataset as deleteDatasetSvc, listJobs as listJobsSvc, createJob as createJobSvc, listModels as listModelsSvc, deployModel as deployModelSvc } from "../services/finetune-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const DatasetParams = z.object({ datasetId: z.string().min(1) });
const ModelParams = z.object({ modelId: z.string().min(1) });

const CreateDatasetBody = z.object({
  brandId: z.string().min(1), name: z.string().min(1), description: z.string().default(""),
  exampleCount: z.number().int().min(1), fileSizeKb: z.number().int().min(1),
});

const CreateJobBody = z.object({
  brandId: z.string().min(1), datasetId: z.string().min(1), jobName: z.string().min(1),
  baseModel: z.enum(["aismos-base-v1", "aismos-caption-v2", "aismos-hashtag-v1", "aismos-tone-v3"]),
  totalEpochs: z.number().int().min(1).max(20).default(5),
});

export async function listDatasets(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const datasets = await listDatasetsSvc(workspaceId);
  response.json(datasets);
}

export async function createDataset(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const body = CreateDatasetBody.parse(request.body);
  const result = await createDatasetSvc({ workspaceId, ...body });
  response.status(201).json(result);
}

export async function deleteDataset(request: Request, response: Response) {
  const { workspaceId, datasetId } = { ...WorkspaceParams.parse(request.params), ...DatasetParams.parse(request.params) };
  await deleteDatasetSvc(datasetId, workspaceId);
  response.status(204).send();
}

export async function listJobs(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const jobs = await listJobsSvc(workspaceId);
  response.json(jobs);
}

export async function createJob(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const body = CreateJobBody.parse(request.body);
  const result = await createJobSvc({ workspaceId, ...body });
  response.status(201).json(result);
}

export async function listModels(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const models = await listModelsSvc(workspaceId);
  response.json(models);
}

export async function deployModel(request: Request, response: Response) {
  const { workspaceId, modelId } = { ...WorkspaceParams.parse(request.params), ...ModelParams.parse(request.params) };
  const result = await deployModelSvc(modelId, workspaceId);
  response.json(result);
}
