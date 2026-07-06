import type { Request, Response } from "express";
import { z } from "zod";
import { PostTemplateCreateSchema } from "@kovixalabs/shared";
import { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate } from "../services/post-template-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const TemplateParams = z.object({ templateId: z.string().min(1) });
const PlatformQuery = z.object({ platform: z.string().optional() });

export async function index(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { platform } = PlatformQuery.parse(request.query);
  response.json(await listTemplates(workspaceId, platform));
}

export async function show(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { templateId } = TemplateParams.parse(request.params);
  response.json(await getTemplate(workspaceId, templateId));
}

export async function create(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const input = PostTemplateCreateSchema.parse(request.body);
  response.status(201).json(await createTemplate(workspaceId, input));
}

export async function update(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { templateId } = TemplateParams.parse(request.params);
  const input = PostTemplateCreateSchema.partial().parse(request.body);
  response.json(await updateTemplate(workspaceId, templateId, input));
}

export async function remove(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { templateId } = TemplateParams.parse(request.params);
  await deleteTemplate(workspaceId, templateId);
  response.status(204).send();
}
