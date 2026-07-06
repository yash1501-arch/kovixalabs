import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { Prisma } from "@prisma/client";
import { triggerWebhookEvent } from "./webhook-service.js";

export async function listCampaigns(workspaceId: string) {
  return prisma.adCampaign.findMany({
    where: { workspaceId },
    include: { variants: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function showCampaign(campaignId: string, workspaceId: string) {
  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
    include: { variants: true },
  });
  if (!campaign || campaign.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Campaign not found.");
  return campaign;
}

export async function createCampaign(input: {
  workspaceId: string;
  brandId: string;
  platform: string;
  objective: string;
  budget: number;
  durationDays: number;
  targetAudience: string;
  brandName: string;
}) {
  const impressions = Math.floor(input.budget * (50 + Math.random() * 100));
  const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.04));
  const conversions = Math.floor(clicks * (0.02 + Math.random() * 0.08));

  return prisma.adCampaign.create({
    data: {
      workspaceId: input.workspaceId,
      brandId: input.brandId,
      platform: input.platform,
      objective: input.objective,
      status: "draft",
      budget: input.budget,
      spent: 0,
      impressions,
      clicks,
      ctr: clicks > 0 ? Number((clicks / impressions * 100).toFixed(2)) : 0,
      cpc: clicks > 0 ? Number((input.budget / clicks).toFixed(2)) : 0,
      conversions,
      targetAudience: input.targetAudience,
      durationDays: input.durationDays,
      variants: {
        create: generateAdVariantData(input.brandName, input.objective),
      },
    },
    include: { variants: true },
  }).then(campaign => {
    fireCampaignWebhook(campaign.id, input.workspaceId, "CAMPAIGN_CREATED");
    return campaign;
  });
}

function fireCampaignWebhook(campaignId: string, workspaceId: string, event: string) {
  prisma.adCampaign.findUnique({ where: { id: campaignId }, select: { status: true, platform: true, objective: true } }).then(campaign => {
    if (campaign) triggerWebhookEvent(workspaceId, event, { campaignId, ...campaign });
  }).catch(() => {});
}

export async function updateCampaign(campaignId: string, workspaceId: string, status: string) {
  const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Campaign not found.");
  const updated = await prisma.adCampaign.update({
    where: { id: campaignId },
    data: { status },
    include: { variants: true },
  });
  fireCampaignWebhook(campaignId, workspaceId, "CAMPAIGN_STATUS_CHANGED");
  return updated;
}

export async function deleteCampaign(campaignId: string, workspaceId: string) {
  const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Campaign not found.");
  await prisma.adCampaign.delete({ where: { id: campaignId } });
}

function generateAdVariantData(brandName: string, objective: string) {
  return [
    {
      headline: `${brandName}: ${objective === "awareness" ? "Discover More" : "Get Started Today"}`,
      body: `Experience the best of ${brandName}.`,
      cta: "Learn More",
      imageStyle: "lifestyle",
      estimatedCtr: `${(2 + Math.random() * 6).toFixed(1)}%`,
    },
    {
      headline: `Transform with ${brandName}`,
      body: `See what ${brandName} can do for you.`,
      cta: "Sign Up",
      imageStyle: "minimal",
      estimatedCtr: `${(2 + Math.random() * 6).toFixed(1)}%`,
    },
    {
      headline: `Why ${brandName}?`,
      body: `Discover why customers choose ${brandName}.`,
      cta: "Get Started",
      imageStyle: "bold",
      estimatedCtr: `${(2 + Math.random() * 6).toFixed(1)}%`,
    },
  ];
}
