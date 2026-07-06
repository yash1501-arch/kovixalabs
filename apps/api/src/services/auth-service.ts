import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { createAuthTokens } from "../utils/jwt.js";
import {
  createWorkspaceName,
  createWorkspaceSlug,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "./helpers.js";

type PrismaUserRecord = Prisma.UserGetPayload<Record<string, never>>;
type WorkspaceMemberWithWorkspace = Prisma.WorkspaceMemberGetPayload<{
  include: { workspace: true };
}>;

export function serializeAuthWorkspace(membership: WorkspaceMemberWithWorkspace) {
  return {
    id: membership.workspace.id,
    name: membership.workspace.name,
    slug: membership.workspace.slug,
    role: membership.role.toLowerCase(),
    createdAt: membership.workspace.createdAt.toISOString(),
    updatedAt: membership.workspace.updatedAt.toISOString(),
  };
}

export function serializeAuthUser(user: PrismaUserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

async function createAuthSession(userId: string, workspaceId: string, role: string, email = "", name: string | null = null) {
  const tokens = createAuthTokens(userId, workspaceId, role, email, name);
  await prisma.userSession.create({
    data: { userId, tokenHash: tokens.accessToken, expiresAt: new Date(tokens.expiresAt) },
  });
  return { token: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: tokens.expiresAt };
}

async function loadPrimaryMembership(user: Pick<PrismaUserRecord, "id" | "email" | "name">) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (membership) return membership;

  const workspaceName = createWorkspaceName(user.name ?? user.email.split("@")[0] ?? "AISMOS");
  return prisma.workspaceMember.create({
    data: {
      user: { connect: { id: user.id } },
      role: "OWNER",
      workspace: { create: { name: workspaceName, slug: createWorkspaceSlug(workspaceName) } },
    },
    include: { workspace: true },
  });
}

async function loadMembershipForUser(userId: string) {
  return prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
}

// ── Prisma auth ──────────────────────────────────────────────

export async function registerUser(input: { name: string; email: string; password: string; workspaceName?: string }) {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "email_already_registered", "An account with this email already exists.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash: await hashPassword(input.password),
      },
    });
    const workspaceName = createWorkspaceName(input.name, input.workspaceName);
    const workspace = await tx.workspace.create({
      data: { name: workspaceName, slug: createWorkspaceSlug(workspaceName) },
    });
    const member = await tx.workspaceMember.create({
      data: {
        userId: created.id,
        workspaceId: workspace.id,
        role: "OWNER",
      },
      include: { workspace: true },
    });
    return { user: created, member };
  });

  const session = await createAuthSession(result.user.id, result.member.workspace.id, result.member.role, result.user.email, result.user.name);
  return { token: session.token, refreshToken: session.refreshToken, expiresAt: session.expiresAt, user: result.user, workspace: serializeAuthWorkspace(result.member) };
}

export async function loginUser(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new ApiError(401, "invalid_credentials", "Email or password is incorrect.");
  }

  const membership = await loadMembershipForUser(user.id);
  if (!membership) {
    throw new ApiError(401, "no_workspace", "No workspace found for this user.");
  }

  const session = await createAuthSession(user.id, membership.workspace.id, membership.role, user.email, user.name);
  return { token: session.token, refreshToken: session.refreshToken, expiresAt: session.expiresAt, user: { ...user, role: membership.role.toLowerCase() }, workspace: serializeAuthWorkspace(membership) };
}

export async function loadSession(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(401, "unauthorized", "User not found.");

  const membership = await loadMembershipForUser(user.id);
  if (!membership) throw new ApiError(401, "unauthorized", "No workspace found.");

  return { user: serializeAuthUser(user), workspace: serializeAuthWorkspace(membership), role: membership.role.toLowerCase() };
}

export async function refreshAuthSession(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(401, "unauthorized", "User not found.");

  const membership = await loadMembershipForUser(user.id);
  if (!membership) throw new ApiError(401, "unauthorized", "No workspace found.");

  const tokens = createAuthTokens(user.id, membership.workspace.id, membership.role, user.email, user.name);
  return { token: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: tokens.expiresAt, expires_in: 86400 };
}

export async function generatePasswordResetToken(email: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user) {
    return "ok";
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 86_400_000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  console.log(`\n[DEV] Password reset token for ${user.email}: ${token}`);
  console.log(`[DEV] Reset URL: http://localhost:3000/auth/reset-password?token=${token}\n`);

  return "ok";
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new ApiError(400, "invalid_token", "Reset token is invalid or expired.");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.userSession.deleteMany({ where: { userId: resetToken.userId } }),
  ]);
}

export async function updateProfile(userId: string, name: string): Promise<{ id: string; email: string; name: string | null }> {
  const user = await prisma.user.update({ where: { id: userId }, data: { name } });
  return serializeAuthUser(user);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ApiError(400, "invalid_password", "Current password is incorrect.");
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.userSession.deleteMany({ where: { userId } }),
  ]);
}

export async function updateWorkspace(workspaceId: string, userId: string, name: string): Promise<{ id: string; name: string; slug: string }> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!membership) throw new ApiError(403, "forbidden", "Only workspace owners and admins can update workspace settings.");
  const workspace = await prisma.workspace.update({ where: { id: workspaceId }, data: { name } });
  return { id: workspace.id, name: workspace.name, slug: workspace.slug };
}
