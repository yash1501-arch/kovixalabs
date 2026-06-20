import type { Request, Response } from "express";
import { z } from "zod";
import { listCampaigns as listSvc, createCampaign as createSvc, updateCampaign as updateSvc, deleteCampaign as deleteSvc } from "../services/campaign-service.js";
import { prisma } from "../db.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const CampaignParams = z.object({ campaignId: z.string().min(1) });

const CreateCampaignBody = z.object({
  brandId: z.string().min(1),
  platform: z.enum(["instagram", "linkedin", "x", "facebook", "tiktok", "youtube"]),
  objective: z.enum(["awareness", "traffic", "engagement", "leads", "sales"]),
  budget: z.number().positive(),
  durationDays: z.number().int().min(1).max(90),
  targetAudience: z.string().min(1),
  adCopy: z.string().optional(),
});

const UpdateCampaignBody = z.object({
  status: z.enum(["draft", "active", "paused", "completed"]),
});

export async function listCampaigns(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const campaigns = await listSvc(workspaceId);
  response.json(campaigns);
}

export async function createCampaign(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const body = CreateCampaignBody.parse(request.body);
  const brand = await prisma.brand.findUnique({ where: { id: body.brandId } });
  const brandName = brand?.name ?? "Brand";

  const result = await createSvc({ workspaceId, ...body, brandName });
  response.status(201).json(result);
}

export async function updateCampaign(request: Request, response: Response) {
  const { workspaceId, campaignId } = { ...WorkspaceParams.parse(request.params), ...CampaignParams.parse(request.params) };
  const body = UpdateCampaignBody.parse(request.body);
  const result = await updateSvc(campaignId, workspaceId, body.status);
  response.json(result);
}

export async function deleteCampaign(request: Request, response: Response) {
  const { workspaceId, campaignId } = { ...WorkspaceParams.parse(request.params), ...CampaignParams.parse(request.params) };
  await deleteSvc(campaignId, workspaceId);
  response.status(204).send();
}
