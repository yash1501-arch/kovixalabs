import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";

export async function ensureWorkspace(workspaceId: string) {
  await prisma.workspace.upsert({
    where: { id: workspaceId },
    update: {},
    create: { id: workspaceId, name: workspaceId, slug: workspaceId },
  });
}

export async function listTeamMembers(workspaceId: string) {
  return prisma.teamMember.findMany({ where: { workspaceId } });
}

export async function seedTeamMembers(workspaceId: string) {
  await ensureWorkspace(workspaceId);
  const existing = await prisma.teamMember.findFirst({ where: { workspaceId } });
  if (existing) return;

  const now = new Date();
  await prisma.teamMember.createMany({
    data: [
      { workspaceId, name: "You", email: "admin@aismos.ai", role: "owner", status: "active", invitedAt: now, joinedAt: now },
      { workspaceId, name: "Sarah Chen", email: "sarah@aismos.ai", role: "admin", status: "active", invitedAt: now, joinedAt: now },
      { workspaceId, name: "Marcus Rivera", email: "marcus@aismos.ai", role: "editor", status: "active", invitedAt: now, joinedAt: now },
      { workspaceId, name: null, email: "pending@example.com", role: "viewer", status: "invited", invitedAt: now, joinedAt: null },
    ],
  });
}

export async function inviteTeamMember(workspaceId: string, email: string, role: string) {
  const existing = await prisma.teamMember.findUnique({
    where: { workspaceId_email: { workspaceId, email } },
  });
  if (existing) throw new ApiError(409, "conflict", "Member already exists.");

  return prisma.teamMember.create({
    data: {
      workspaceId,
      email,
      role,
      name: null,
      status: "invited",
      invitedAt: new Date(),
      joinedAt: null,
    },
  });
}

export async function updateTeamMemberRole(memberId: string, workspaceId: string, role: string) {
  const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
  if (!member || member.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Member not found.");
  if (member.role === "owner") throw new ApiError(400, "cannot_change_owner", "Cannot change owner role.");

  return prisma.teamMember.update({
    where: { id: memberId },
    data: { role },
  });
}

export async function removeTeamMember(memberId: string, workspaceId: string) {
  const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
  if (!member || member.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Member not found.");
  if (member.role === "owner") throw new ApiError(400, "cannot_remove_owner", "Cannot remove workspace owner.");
  await prisma.teamMember.delete({ where: { id: memberId } });
}

export async function getAuditLogs(workspaceId: string, userEmail: string) {
  await seedAuditLogs(workspaceId, userEmail);
  return prisma.auditLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

async function seedAuditLogs(workspaceId: string, userEmail: string) {
  await ensureWorkspace(workspaceId);
  const existing = await prisma.auditLog.findFirst({ where: { workspaceId } });
  if (existing) return;

  const now = new Date();
  const actions = [
    { action: "brand.create", resource: "brand", details: "Created new brand 'AISMOS Pro'" },
    { action: "post.schedule", resource: "post", details: "Scheduled 3 Instagram posts" },
    { action: "autopilot.run", resource: "autopilot", details: "Autopilot generated 5 posts" },
    { action: "team.invite", resource: "team", details: "Invited marcus@aismos.ai as editor" },
    { action: "campaign.create", resource: "campaign", details: "Created awareness campaign" },
  ];

  await prisma.auditLog.createMany({
    data: actions.map((a, i) => ({
      workspaceId,
      userEmail,
      action: a.action,
      resource: a.resource,
      details: a.details,
      resourceId: null,
      ipAddress: "192.168.1.100",
      createdAt: new Date(now.getTime() - i * 3600000),
    })),
  });
}
