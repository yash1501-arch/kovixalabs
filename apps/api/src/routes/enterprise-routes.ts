import { Router, type RequestHandler } from "express";
import { listTeamMembers, inviteTeamMember, updateTeamMember, removeTeamMember, getBilling, getUsage, getAuditLogs } from "../controllers/enterprise-controller.js";
import { optionalAuth } from "../middleware/auth.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const enterpriseRouter = Router();

enterpriseRouter.get("/workspaces/:workspaceId/team", optionalAuth, asyncRoute(listTeamMembers));
enterpriseRouter.post("/workspaces/:workspaceId/team/invite", optionalAuth, asyncRoute(inviteTeamMember));
enterpriseRouter.patch("/workspaces/:workspaceId/team/:memberId", optionalAuth, asyncRoute(updateTeamMember));
enterpriseRouter.delete("/workspaces/:workspaceId/team/:memberId", optionalAuth, asyncRoute(removeTeamMember));
enterpriseRouter.get("/workspaces/:workspaceId/billing", optionalAuth, asyncRoute(getBilling));
enterpriseRouter.get("/workspaces/:workspaceId/usage", optionalAuth, asyncRoute(getUsage));
enterpriseRouter.get("/workspaces/:workspaceId/audit-logs", optionalAuth, asyncRoute(getAuditLogs));
