import type { Request, Response } from "express";
import { z } from "zod";
import {
  listVideoProjects,
  createVideoProject,
  loadVideoProject,
  updateVideoProject,
  deleteVideoProject,
  generateProjectScript,
} from "../services/video-project-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const ProjectParams = z.object({ projectId: z.string().min(1) });

const CreateSchema = z.object({
  brandId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  script: z.string().optional(),
  scenes: z.array(z.any()).optional(),
  style: z.string().optional(),
  duration: z.number().int().optional(),
  resolution: z.string().optional(),
  platform: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
});

const UpdateSchema = z.object({
  renderedUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  voiceoverUrl: z.string().optional(),
  musicTrack: z.string().optional(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REJECTED"]).optional(),
});

export async function index(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  response.json(await listVideoProjects(workspaceId));
}

export async function create(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const input = CreateSchema.parse(request.body);
  response.status(201).json(await createVideoProject(workspaceId, input));
}

export async function show(request: Request, response: Response) {
  const { workspaceId, projectId } = { ...WorkspaceParams.parse(request.params), ...ProjectParams.parse(request.params) };
  response.json(await loadVideoProject(projectId, workspaceId));
}

export async function update(request: Request, response: Response) {
  const { workspaceId, projectId } = { ...WorkspaceParams.parse(request.params), ...ProjectParams.parse(request.params) };
  const input = UpdateSchema.parse(request.body);
  response.json(await updateVideoProject(projectId, workspaceId, input));
}

export async function destroy(request: Request, response: Response) {
  const { workspaceId, projectId } = { ...WorkspaceParams.parse(request.params), ...ProjectParams.parse(request.params) };
  await deleteVideoProject(projectId, workspaceId);
  response.status(204).send();
}

export async function generateScript(request: Request, response: Response) {
  const { workspaceId, projectId } = { ...WorkspaceParams.parse(request.params), ...ProjectParams.parse(request.params) };
  response.json(await generateProjectScript(projectId, workspaceId));
}
