import pino from "pino";
import { prisma } from "../db.js";
import { decryptToken, encryptToken } from "../utils/token-encryption.js";
import { env } from "../config.js";

const logger = pino({ level: env.nodeEnv === "test" ? "silent" : "info" });

export async function refreshYouTubeTokens(): Promise<{ checked: number; refreshed: number; failed: number }> {
  const { refreshAccessToken } = await import("./youtube-api.js");
  const expiringBefore = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accounts = await prisma.socialAccount.findMany({
    where: {
      connected: true,
      platform: "youtube",
      accessToken: { not: null },
      refreshToken: { not: null },
      OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { lte: expiringBefore } }],
    },
  });

  let refreshed = 0;
  let failed = 0;

  for (const account of accounts) {
    try {
      const currentRefreshToken = decryptToken(account.refreshToken!);
      const result = await refreshAccessToken(currentRefreshToken);
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: encryptToken(result.access_token),
          tokenExpiresAt: result.expires_in
            ? new Date(Date.now() + result.expires_in * 1000)
            : account.tokenExpiresAt,
          ...(result.refresh_token ? { refreshToken: encryptToken(result.refresh_token) } : {}),
        },
      });
      refreshed++;
    } catch (err) {
      logger.error({ err, accountId: account.id }, "YouTube token refresh failed");
      failed++;
    }
  }

  return { checked: accounts.length, refreshed, failed };
}

export async function refreshTikTokTokens(): Promise<{ checked: number; refreshed: number; failed: number }> {
  const { refreshAccessToken } = await import("./tiktok-api.js");
  const expiringBefore = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accounts = await prisma.socialAccount.findMany({
    where: {
      connected: true,
      platform: "tiktok",
      accessToken: { not: null },
      refreshToken: { not: null },
      OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { lte: expiringBefore } }],
    },
  });

  let refreshed = 0;
  let failed = 0;

  for (const account of accounts) {
    try {
      const currentRefreshToken = decryptToken(account.refreshToken!);
      const result = await refreshAccessToken(currentRefreshToken);
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: encryptToken(result.access_token),
          tokenExpiresAt: result.expires_in
            ? new Date(Date.now() + result.expires_in * 1000)
            : account.tokenExpiresAt,
          ...(result.refresh_token ? { refreshToken: encryptToken(result.refresh_token) } : {}),
        },
      });
      refreshed++;
    } catch (err) {
      logger.error({ err, accountId: account.id }, "TikTok token refresh failed");
      failed++;
    }
  }

  return { checked: accounts.length, refreshed, failed };
}

export async function refreshTwitterTokens(): Promise<{ checked: number; refreshed: number; failed: number }> {
  const { refreshAccessToken } = await import("./twitter-api.js");
  const expiringBefore = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accounts = await prisma.socialAccount.findMany({
    where: {
      connected: true,
      platform: { in: ["twitter", "x"] },
      accessToken: { not: null },
      refreshToken: { not: null },
      OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { lte: expiringBefore } }],
    },
  });

  let refreshed = 0;
  let failed = 0;

  for (const account of accounts) {
    try {
      const currentRefreshToken = decryptToken(account.refreshToken!);
      const result = await refreshAccessToken(currentRefreshToken);
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: encryptToken(result.access_token),
          tokenExpiresAt: result.expires_in
            ? new Date(Date.now() + result.expires_in * 1000)
            : account.tokenExpiresAt,
          ...(result.refresh_token ? { refreshToken: encryptToken(result.refresh_token) } : {}),
        },
      });
      refreshed++;
    } catch (err) {
      logger.error({ err, accountId: account.id }, "Twitter token refresh failed");
      failed++;
    }
  }

  return { checked: accounts.length, refreshed, failed };
}
