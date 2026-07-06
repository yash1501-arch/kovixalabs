import type { Request, Response } from "express";
import { z } from "zod";
import {
  listFaceSwapJobs,
  createFaceSwapJob,
  loadFaceSwapJob,
  updateFaceSwapJob,
  deleteFaceSwapJob,
} from "../services/face-swap-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const JobParams = z.object({ jobId: z.string().min(1) });

const CreateSchema = z.object({
  brandId: z.string().min(1),
  sourceImageUrl: z.string().url(),
  targetImageUrl: z.string().url(),
  parameters: z.record(z.any()).optional(),
});

const UpdateSchema = z.object({
  resultUrl: z.string().optional(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REJECTED"]).optional(),
  error: z.string().optional(),
});

export async function index(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  response.json(await listFaceSwapJobs(workspaceId));
}

export async function create(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const input = CreateSchema.parse(request.body);
  response.status(201).json(await createFaceSwapJob(workspaceId, input));
}

export async function show(request: Request, response: Response) {
  const { workspaceId, jobId } = { ...WorkspaceParams.parse(request.params), ...JobParams.parse(request.params) };
  response.json(await loadFaceSwapJob(jobId, workspaceId));
}

export async function update(request: Request, response: Response) {
  const { workspaceId, jobId } = { ...WorkspaceParams.parse(request.params), ...JobParams.parse(request.params) };
  const input = UpdateSchema.parse(request.body);
  response.json(await updateFaceSwapJob(jobId, workspaceId, input));
}

export async function destroy(request: Request, response: Response) {
  const { workspaceId, jobId } = { ...WorkspaceParams.parse(request.params), ...JobParams.parse(request.params) };
  await deleteFaceSwapJob(jobId, workspaceId);
  response.status(204).send();
}
