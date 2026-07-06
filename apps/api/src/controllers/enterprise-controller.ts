import type { Request, Response } from "express";
import { z } from "zod";
import { sendPaginated, sendSuccess } from "../utils/response.js";
import { parsePagination } from "../utils/pagination.js";
import { listTeamMembers as listMembersSvc, seedTeamMembers as seedMembersSvc, inviteTeamMember as inviteMemberSvc, updateTeamMemberRole, removeTeamMember as removeMemberSvc, getAuditLogs as getAuditLogsSvc } from "../services/enterprise-service.js";
import { getOrCreateBilling, getWorkspaceUsage } from "../services/billing-service.js";
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
  const billing = await getOrCreateBilling(workspaceId);
  sendSuccess(response, {
    workspaceId,
    plan: billing?.plan ?? "team",
    status: billing?.status ?? "active",
    seats: { total: billing?.seatsTotal ?? 10, used: billing?.seatsUsed ?? 1 },
    billing: {
      amount: billing?.amount ?? 0,
      currency: billing?.currency ?? "usd",
      interval: billing?.interval ?? "monthly",
      nextBillingDate: billing?.nextBillingAt?.toISOString().split("T")[0] ?? null,
    },
    paymentMethod: billing?.paymentMethod
      ? { type: billing.paymentMethod, last4: billing.paymentLast4, brand: billing.paymentBrand }
      : null,
  });
}

export async function getUsage(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const usage = await getWorkspaceUsage(workspaceId);
  sendSuccess(response, usage);
}

export async function getAuditLogs(request: Request, response: Response) {
  const { workspaceId } = WorkspaceParams.parse(request.params);
  const userEmail = request.user?.email ?? "unknown@example.com";
  const allLogs = await getAuditLogsSvc(workspaceId, userEmail);
  const { page, limit } = parsePagination(request.query as Record<string, string | undefined>);
  sendPaginated(response, allLogs.slice((page - 1) * limit, page * limit), page, limit, allLogs.length);
}
