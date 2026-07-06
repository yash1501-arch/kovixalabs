import type { Request, Response } from "express";
import { z } from "zod";
import { listPosts } from "../services/post-service.js";
import { listBrands } from "../services/brand-service.js";
import { listSocialAccounts } from "../services/social-helper.js";
import { listTrends as listTrendsSvc, seedTrends as seedTrendsSvc, refreshTrends as refreshTrendsSvc, listImagePrompts as listImagePromptsSvc, createImagePrompt as createImagePromptSvc, deleteImagePrompt as deleteImagePromptSvc } from "../services/trend-service.js";
import { getWorkspaceStats } from "../services/analytics-service.js";
import { prisma } from "../db.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const BrandParams = z.object({ brandId: z.string().min(1) });
const ImagePromptParams = z.object({ promptId: z.string().min(1) });

const ImagePromptBody = z.object({
  brandId: z.string().min(1),
  platform: z.enum(["instagram", "linkedin", "x", "facebook", "tiktok", "youtube"]),
  topic: z.string().min(1),
  style: z.string().optional(),
  aspectRatio: z.enum(["1:1", "4:5", "16:9", "9:16"]).default("1:1"),
});

export async function workspaceAnalytics(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { period } = z.object({ period: z.enum(["7d", "30d", "90d"]).default("30d") }).parse(request.query);
  const stats = await getWorkspaceStats(workspaceId, period);
  response.json(stats);
}

export async function dashboardStats(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const [brands, posts, accounts] = await Promise.all([
    listBrands(workspaceId),
    listPosts(workspaceId),
    listSocialAccounts(workspaceId),
  ]);

  const tasks = await prisma.aiTask.count({ where: { workspaceId } });

  response.json({
    brands: brands.length,
    aiTasks: tasks,
    draftPosts: posts.filter((p) => p.status === "draft").length,
    publishedPosts: posts.filter((p) => p.status === "published").length,
    scheduledPosts: posts.filter((p) => p.status === "scheduled").length,
    connectedAccounts: accounts.length,
  });
}

export async function listTrends(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  await seedTrendsSvc(workspaceId);
  const trends = await listTrendsSvc(workspaceId);
  response.json(trends);
}

export async function refreshTrends(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const trends = await refreshTrendsSvc(workspaceId);
  response.json(trends);
}

export async function listImagePrompts(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const prompts = await listImagePromptsSvc(workspaceId);
  response.json(prompts);
}

export async function createImagePrompt(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  const body = ImagePromptBody.parse(request.body);
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  const workspaceId = brand?.workspaceId ?? "default";

  const result = await createImagePromptSvc({
    workspaceId, brandId, platform: body.platform, topic: body.topic,
    style: body.style ?? "editorial", aspectRatio: body.aspectRatio,
  });
  response.status(201).json(result);
}

export async function deleteImagePrompt(request: Request, response: Response) {
  const { workspaceId, promptId } = { ...WorkspaceParams.parse(request.params), ...ImagePromptParams.parse(request.params) };
  await deleteImagePromptSvc(promptId, workspaceId);
  response.status(204).send();
}
