import { SocialAccountRecordSchema } from "@kovixalabs/shared";
import type { SocialPlatform } from "@kovixalabs/shared";
import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { ensureWorkspace } from "./post-service.js";
import { nowIso } from "./helpers.js";

type PrismaSocialAccountRecord = import("@prisma/client").SocialAccount;

export const mockAvatars: Record<string, string> = {
  instagram: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
  "instagram-basic": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
  linkedin: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
  x: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80",
  facebook: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
  tiktok: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&q=80",
  youtube: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&q=80",
};

export const followerCountDefaults: Record<SocialPlatform, () => number> = {
  instagram: () => Math.floor(Math.random() * 50000) + 1000,
  "instagram-basic": () => Math.floor(Math.random() * 5000) + 100,
  linkedin: () => Math.floor(Math.random() * 20000) + 500,
  x: () => Math.floor(Math.random() * 30000) + 800,
  facebook: () => Math.floor(Math.random() * 40000) + 2000,
  tiktok: () => Math.floor(Math.random() * 100000) + 5000,
  youtube: () => Math.floor(Math.random() * 15000) + 200,
};

export function serializeSocialAccount(account: PrismaSocialAccountRecord | any) {
  const connectedAtStr = account.connectedAt instanceof Date
    ? account.connectedAt.toISOString()
    : new Date(account.connectedAt).toISOString();
  let tokenExpiresAtStr: string | undefined;
  if (account.tokenExpiresAt) {
    tokenExpiresAtStr = account.tokenExpiresAt instanceof Date
      ? account.tokenExpiresAt.toISOString()
      : new Date(account.tokenExpiresAt).toISOString();
  }
  const avatarUrl = account.avatarUrl || mockAvatars[account.platform] || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80";
  let platformMetadata: Record<string, any> | undefined;
  if (account.platformMetadata) {
    const raw = account.platformMetadata;
    platformMetadata = typeof raw === "string" ? JSON.parse(raw) : raw;
  }
  return SocialAccountRecordSchema.parse({
    id: account.id,
    workspaceId: account.workspaceId,
    platform: account.platform,
    handle: account.handle,
    displayName: account.displayName,
    connected: account.connected,
    connectedAt: connectedAtStr,
    followerCount: account.followerCount,
    avatarUrl,
    accessToken: account.accessToken ?? undefined,
    tokenExpiresAt: tokenExpiresAtStr,
    pageAccessToken: account.pageAccessToken ?? undefined,
    platformMetadata,
  });
}

export async function listSocialAccounts(workspaceId: string) {
  const accounts = await prisma.socialAccount.findMany({
    where: { workspaceId },
    orderBy: { connectedAt: "desc" },
  });
  return accounts.map(serializeSocialAccount);
}

export async function connectSocialAccount(workspaceId: string, input: { platform: SocialPlatform; handle: string; displayName: string }) {
  const followerCount = followerCountDefaults[input.platform]?.() ?? 1000;
  const mockToken = `mock-access-token-${crypto.randomUUID()}`;
  const tokenExpires = new Date(Date.now() + 365 * 86400000);
  await ensureWorkspace(workspaceId);
  const existing = await prisma.socialAccount.findFirst({ where: { workspaceId, platform: input.platform } });
  const account = existing
    ? await prisma.socialAccount.update({
        where: { id: existing.id },
        data: { handle: input.handle, displayName: input.displayName, username: input.handle, connected: true, connectedAt: new Date(), followerCount, accessToken: mockToken, tokenExpiresAt: tokenExpires },
      })
    : await prisma.socialAccount.create({
        data: { workspaceId, userId: workspaceId, platform: input.platform, platformUserId: `${input.platform}-${crypto.randomUUID()}`, username: input.handle, handle: input.handle, displayName: input.displayName, connected: true, followerCount, accessToken: mockToken, tokenExpiresAt: tokenExpires },
      });
  return serializeSocialAccount(account);
}

export async function deleteSocialAccount(workspaceId: string, accountId: string): Promise<void> {
  const account = await prisma.socialAccount.findFirst({ where: { id: accountId, workspaceId }, select: { id: true } });
  if (!account) throw new ApiError(404, "not_found", "Social account not found.");
  await prisma.socialAccount.delete({ where: { id: accountId } });
}
