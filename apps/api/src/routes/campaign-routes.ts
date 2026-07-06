import { Router, type RequestHandler } from "express";
import { listCampaigns, showCampaign, createCampaign, updateCampaign, deleteCampaign } from "../controllers/campaign-controller.js";
import { requireWorkspaceAuth } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const campaignRouter = Router();

campaignRouter.get("/workspaces/:workspaceId/campaigns", ...requireWorkspaceAuth(), asyncRoute(listCampaigns));
campaignRouter.get("/workspaces/:workspaceId/campaigns/:campaignId", ...requireWorkspaceAuth(), asyncRoute(showCampaign));
campaignRouter.post("/workspaces/:workspaceId/campaigns", ...requireWorkspaceAuth(), asyncRoute(createCampaign));
campaignRouter.patch("/workspaces/:workspaceId/campaigns/:campaignId", ...requireWorkspaceAuth(), asyncRoute(updateCampaign));
campaignRouter.delete("/workspaces/:workspaceId/campaigns/:campaignId", ...requireWorkspaceAuth(), asyncRoute(deleteCampaign));
