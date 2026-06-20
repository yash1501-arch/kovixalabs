import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../utils/api-error.js";
import { sendPaginated, sendSuccess } from "../utils/response.js";
import { parsePagination } from "../utils/pagination.js";
import { listTeamMembers as listMembersSvc, seedTeamMembers as seedMembersSvc, inviteTeamMember as inviteMemberSvc, updateTeamMemberRole, removeTeamMember as removeMemberSvc, getAuditLogs as getAuditLogsSvc } from "../services/enterprise-service.js";
import { prisma } from "../db.js";

const WorkspaceParams = z.object({ workspaceId: z.string().min(1) });
const MemberParams = z.object({ memberId: z.string().min(1) });

export async function listTeamMembers(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  await seedMembersSvc(workspaceId);
  const allMembers = await listMembersSvc(workspaceId);
  const { page, limit } = parsePagination(request.query as Record<string, string | undefined>);
  sendPaginated(response, allMembers.slice((page - 1) * limit, page * limit), page, limit, allMembers.length);
}

export async function inviteTeamMember(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const body = z.object({ email: z.string().email(), role: z.enum(["admin", "editor", "viewer"]) }).parse(request.body);
  const member = await inviteMemberSvc(workspaceId, body.email, body.role);
  sendSuccess(response, member, 201);
}

export async function updateTeamMember(request: Request, response: Response) {
  const { workspaceId, memberId } = { ...WorkspaceParams.parse(request.params), ...MemberParams.parse(request.params) };
  const body = z.object({ role: z.enum(["admin", "editor", "viewer"]) }).parse(request.body);
  const member = await updateTeamMemberRole(memberId, workspaceId, body.role);
  sendSuccess(response, member);
}

export async function removeTeamMember(request: Request, response: Response) {
  const { workspaceId, memberId } = { ...WorkspaceParams.parse(request.params), ...MemberParams.parse(request.params) };
  await removeMemberSvc(memberId, workspaceId);
  response.status(204).send();
}

export async function getBilling(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  sendSuccess(response, {
    workspaceId, plan: "team", status: "active", seats: { total: 10, used: 4 },
    billing: { amount: 79900, currency: "usd", interval: "annual", nextBillingDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] },
    paymentMethod: { type: "card", last4: "4242", brand: "visa" },
  });
}

export async function getUsage(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const posts = await prisma.post.findMany({ where: { workspaceId } });
  sendSuccess(response, {
    workspaceId, period: { start: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0], end: new Date().toISOString().split("T")[0] },
    posts: { scheduled: posts.filter((p) => p.status === "SCHEDULED").length, published: posts.filter((p) => p.status === "PUBLISHED").length, total: posts.length },
    aiGenerations: { used: Math.floor(150 + Math.random() * 350), limit: 1000 },
    apiCalls: { used: Math.floor(5000 + Math.random() * 5000), limit: 50000 },
    storage: { used: Math.floor(200 + Math.random() * 800), limit: 5000 },
  });
}

export async function getAuditLogs(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const userEmail = (request.headers["x-user-email"] as string | undefined) ?? "user@example.com";
  const allLogs = await getAuditLogsSvc(workspaceId, userEmail);
  const { page, limit } = parsePagination(request.query as Record<string, string | undefined>);
  sendPaginated(response, allLogs.slice((page - 1) * limit, page * limit), page, limit, allLogs.length);
}
