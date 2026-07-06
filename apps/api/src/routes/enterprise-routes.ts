import { Router, type RequestHandler } from "express";
import { listTeamMembers, inviteTeamMember, updateTeamMember, removeTeamMember, getBilling, getUsage, getAuditLogs } from "../controllers/enterprise-controller.js";
import { requireWorkspaceAuth, requireRole } from "../middleware/rbac.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
}

export const enterpriseRouter = Router();

enterpriseRouter.get("/workspaces/:workspaceId/team", ...requireWorkspaceAuth(), asyncRoute(listTeamMembers));
enterpriseRouter.post("/workspaces/:workspaceId/team/invite", ...requireWorkspaceAuth(), requireRole("admin"), asyncRoute(inviteTeamMember));
enterpriseRouter.patch("/workspaces/:workspaceId/team/:memberId", ...requireWorkspaceAuth(), requireRole("admin"), asyncRoute(updateTeamMember));
enterpriseRouter.delete("/workspaces/:workspaceId/team/:memberId", ...requireWorkspaceAuth(), requireRole("admin"), asyncRoute(removeTeamMember));
enterpriseRouter.get("/workspaces/:workspaceId/billing", ...requireWorkspaceAuth(), asyncRoute(getBilling));
enterpriseRouter.get("/workspaces/:workspaceId/usage", ...requireWorkspaceAuth(), asyncRoute(getUsage));
enterpriseRouter.get("/workspaces/:workspaceId/audit-logs", ...requireWorkspaceAuth(), asyncRoute(getAuditLogs));
