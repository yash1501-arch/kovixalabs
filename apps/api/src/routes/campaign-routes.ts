import { Router, type RequestHandler } from "express";
import { listCampaigns, createCampaign, updateCampaign, deleteCampaign } from "../controllers/campaign-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const campaignRouter = Router();

campaignRouter.get("/workspaces/:workspaceId/campaigns", optionalAuth, asyncRoute(listCampaigns));
campaignRouter.post("/workspaces/:workspaceId/campaigns", requireAuth, asyncRoute(createCampaign));
campaignRouter.patch("/workspaces/:workspaceId/campaigns/:campaignId", requireAuth, asyncRoute(updateCampaign));
campaignRouter.delete("/workspaces/:workspaceId/campaigns/:campaignId", requireAuth, asyncRoute(deleteCampaign));
