import type { Request, Response } from "express";
import { z } from "zod";
import {
  listNewsSources,
  createNewsSource,
  deleteNewsSource,
  listNewsArticles,
  createNewsArticle,
  updateNewsArticle,
} from "../services/news-source-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const SourceParams = z.object({ sourceId: z.string().min(1) });
const ArticleParams = z.object({ articleId: z.string().min(1) });

const CreateSourceSchema = z.object({
  brandId: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  type: z.string().default("RSS"),
  category: z.string().optional(),
  scrapeInterval: z.number().int().optional(),
});

const CreateArticleSchema = z.object({
  sourceId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  content: z.string().optional(),
  summary: z.string().optional(),
  author: z.string().optional(),
  publishedAt: z.string().optional(),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
  keywords: z.array(z.string()).default([]),
});

const UpdateArticleSchema = z.object({
  read: z.boolean().optional(),
  saved: z.boolean().optional(),
  relevanceScore: z.number().optional(),
  sentiment: z.string().optional(),
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
  const sourceId = request.query.sourceId as string | undefined;
  response.json(await listNewsArticles(workspaceId, sourceId));
}

export async function createArticle(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const input = CreateArticleSchema.parse(request.body);
  response.status(201).json(await createNewsArticle(workspaceId, input));
}

export async function updateArticle(request: Request, response: Response) {
  const { workspaceId, articleId } = { ...WorkspaceParams.parse(request.params), ...ArticleParams.parse(request.params) };
  const input = UpdateArticleSchema.parse(request.body);
  response.json(await updateNewsArticle(articleId, workspaceId, input));
}
