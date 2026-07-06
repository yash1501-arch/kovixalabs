import type { Request, Response } from "express";
import { z } from "zod";
import { getWorkspaceStats, getBrandPerformance, analyzeEngagement } from "../services/analytics-service.js";
import { researchHashtags, rechargeHashtags } from "../services/hashtag-research-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const BrandParams = z.object({ brandId: z.string().min(1) });

const ResearchSchema = z.object({
  hashtags: z.array(z.string()).default([]),
  topic: z.string().min(1),
  platform: z.string().min(1),
  industry: z.string().optional(),
});

const RechargeSchema = z.object({
  current_hashtags: z.array(z.string()).default([]),
  topic: z.string().optional(),
  count: z.number().int().min(5).max(30).default(10),
});

export async function workspaceStats(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { period } = z.object({ period: z.enum(["7d", "30d", "90d"]).default("30d") }).parse(request.query);
  response.json(await getWorkspaceStats(workspaceId, period));
}

export async function brandPerformance(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  response.json(await getBrandPerformance(brandId));
}

export async function brandEngagement(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  const query = z.object({ platform: z.string().optional() }).parse(request.query);
  response.json(await analyzeEngagement({ workspaceId: "", brandId, platform: query.platform }));
}

export async function hashtagResearch(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  const input = ResearchSchema.parse(request.body);
  const result = await researchHashtags({ ...input, brand_id: brandId });
  response.json(result);
}

export async function hashtagRecharge(request: Request, response: Response) {
  const { brandId } = BrandParams.parse(request.params);
  const query = z.object({ platform: z.string().min(1) }).parse(request.query);
  const input = RechargeSchema.parse(request.body);
  const result = await rechargeHashtags({ ...input, brand_id: brandId, platform: query.platform });
  response.json(result);
}
