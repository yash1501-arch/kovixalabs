import type { Request, Response } from "express";
import { z } from "zod";
import {
  analyzeArticles,
  createNewsSource,
  deleteNewsSource,
  listNewsArticles,
  listNewsSources,
  scrapeNewsSource,
} from "../services/news-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const SourceParams = z.object({ sourceId: z.string().min(1) });

const CreateSourceSchema = z.object({
  brandId: z.string().min(1),
  name: z.string().min(1).max(255),
  url: z.string().url(),
  category: z.string().optional(),
});

export async function listSources(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  response.json(await listNewsSources(workspaceId));
}

export async function createSource(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const input = CreateSourceSchema.parse(request.body);
  response.status(201).json(await createNewsSource(workspaceId, input));
}

export async function destroySource(request: Request, response: Response) {
  const { workspaceId, sourceId } = { ...WorkspaceParams.parse(request.params), ...SourceParams.parse(request.params) };
  await deleteNewsSource(sourceId, workspaceId);
  response.status(204).send();
}

export async function listArticles(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { sourceId } = z.object({ sourceId: z.string().optional() }).parse(request.query);
  response.json(await listNewsArticles(workspaceId, sourceId));
}

export async function scrape(request: Request, response: Response) {
  const { workspaceId, sourceId } = { ...WorkspaceParams.parse(request.params), ...SourceParams.parse(request.params) };
  response.json(await scrapeNewsSource(sourceId, workspaceId));
}

export async function analyze(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { sourceId } = z.object({ sourceId: z.string().optional() }).parse(request.body);
  response.json(await analyzeArticles(workspaceId, sourceId));
}
