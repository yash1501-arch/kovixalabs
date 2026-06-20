import type { Request, Response } from "express";
import { z } from "zod";
import { listInsights, analyzeLearning, loadProfile } from "../services/learning-service.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const AnalyzeBody = z.object({ brandId: z.string().min(1) });

export async function listLearningInsightsHandler(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { brandId } = z.object({ brandId: z.string().optional() }).parse(request.query);
  const insights = await listInsights(workspaceId, brandId);
  response.json(insights);
}

export async function analyzeLearningHandler(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { brandId } = AnalyzeBody.parse(request.body);
  const result = await analyzeLearning(workspaceId, brandId);
  response.json(result);
}

export async function loadLearningProfileHandler(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const { brandId } = z.object({ brandId: z.string().min(1) }).parse(request.query);
  const profile = await loadProfile(workspaceId, brandId);
  response.json(profile);
}
