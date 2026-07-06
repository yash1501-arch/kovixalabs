import type { Prisma, SocialAccount } from "@prisma/client";
import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { decryptToken, encryptToken } from "../utils/token-encryption.js";
import {
  debugToken,
  exchangeForLongLivedToken,
  fetchFacebookPages,
  fetchInstagramBusinessAccount,
  scopesFor,
  tokenExpiryFromResponse,
  type FacebookPage,
  type InstagramBusinessAccount,
  type MetaPlatform
} from "./meta-api.js";
import * as linkedin from "./linkedin-api.js";
import * as twitter from "./twitter-api.js";
import * as tiktok from "./tiktok-api.js";
import * as youtube from "./youtube-api.js";
import * as instagramBasic from "./instagram-api.js";
import { researchSocialProfile } from "./ai-client.js";

export type SocialPlatform = "facebook" | "instagram" | "instagram-basic" | "linkedin" | "twitter" | "tiktok" | "youtube";

export type PublicSocialAccount = {
  id: string;
  userId: string;
  workspaceId: string;
  platform: SocialPlatform;
  platformUserId: string;
  username: string | null;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  connected: boolean;
  connectedAt: string;
  followerCount: number;
  tokenExpiresAt: string | null;
  scopes: string[];
  metadata: Prisma.JsonValue | null;
};

type SaveAccountInput = {
  workspaceId: string;
  userId: string;
  platform: MetaPlatform;
  platformUserId: string;
  username: string | null;
  handle: string;
  displayName: string;
  followerCount: number;
  accessToken: string;
  pageAccessToken?: string;
  tokenExpiresAt: Date | null;
  scopes: string[];
  metadata: Prisma.InputJsonValue;
};

export function serializePublicSocialAccount(
  account: SocialAccount
): PublicSocialAccount {
  const metadata =
    account.metadata ??
    account.platformMetadata ??
    null;
  const avatarUrl =
    typeof metadata === "object" &&
    metadata !== null &&
    !Array.isArray(metadata) &&
    typeof (metadata as Record<string, unknown>).profilePictureUrl === "string"
      ? ((metadata as Record<string, unknown>).profilePictureUrl as string)
      : null;

  return {
    id: account.id,
    userId: account.userId,
    workspaceId: account.workspaceId,
    platform: account.platform as SocialPlatform,
    platformUserId: account.platformUserId,
    username: account.username,
    handle: account.handle,
    displayName: account.displayName,
    avatarUrl,
    connected: account.connected,
    connectedAt: account.connectedAt.toISOString(),
    followerCount: account.followerCount,
    tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
    scopes: account.scopes,
    metadata
  };
}

export async function listConnectedAccounts(input: {
  workspaceId: string;
  userId?: string;
}): Promise<PublicSocialAccount[]> {
  const accounts = await prisma.socialAccount.findMany({
    where: {
      workspaceId: input.workspaceId,
      connected: true,
      ...(input.userId ? { userId: input.userId } : {})
    },
    orderBy: { connectedAt: "desc" }
  });

  return accounts.map(serializePublicSocialAccount);
}

async function upsertMetaAccount(input: SaveAccountInput): Promise<SocialAccount> {
  const existing = await prisma.socialAccount.findFirst({
    where: {
      workspaceId: input.workspaceId,
      platform: input.platform,
      platformUserId: input.platformUserId
    }
  });
  const encryptedAccessToken = encryptToken(input.accessToken);
  const encryptedPageAccessToken = input.pageAccessToken
    ? encryptToken(input.pageAccessToken)
    : null;

  const data = {
    userId: input.userId,
    username: input.username,
    handle: input.handle,
    displayName: input.displayName,
    connected: true,
    connectedAt: new Date(),
    followerCount: input.followerCount,
    accessToken: encryptedAccessToken,
    pageAccessToken: encryptedPageAccessToken,
    tokenExpiresAt: input.tokenExpiresAt,
    scopes: input.scopes,
    metadata: input.metadata,
    platformMetadata: input.metadata
  };

  if (existing) {
    return prisma.socialAccount.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.socialAccount.create({
    data: {
      workspaceId: input.workspaceId,
      platform: input.platform,
      platformUserId: input.platformUserId,
      ...data
    }
  });
}

export async function saveFacebookPages(input: {
  workspaceId: string;
  userId: string;
  longLivedUserToken: string;
  tokenExpiresAt: Date | null;
  scopes: string[];
  pages: FacebookPage[];
}): Promise<SocialAccount[]> {
  const saved: SocialAccount[] = [];

  for (const page of input.pages) {
    const pageAccessToken = page.access_token ?? input.longLivedUserToken;
    const metadata = {
      pageId: page.id,
      category: page.category ?? null,
      pageUrl: page.link ?? `https://facebook.com/${page.id}`,
      fanCount: page.fan_count ?? 0,
      followersCount: page.followers_count ?? page.fan_count ?? 0,
      profilePictureUrl: page.picture?.data?.url ?? null,
      hasInstagramBusinessAccount: Boolean(page.instagram_business_account?.id)
    };

    saved.push(
      await upsertMetaAccount({
        workspaceId: input.workspaceId,
        userId: input.userId,
        platform: "facebook",
        platformUserId: page.id,
        username: page.name,
        handle: page.name,
        displayName: page.name,
        followerCount: page.followers_count ?? page.fan_count ?? 0,
        accessToken: input.longLivedUserToken,
        pageAccessToken,
        tokenExpiresAt: input.tokenExpiresAt,
        scopes: input.scopes,
        metadata
      })
    );
  }

  return saved;
}

export async function saveInstagramAccounts(input: {
  workspaceId: string;
  userId: string;
  longLivedUserToken: string;
  tokenExpiresAt: Date | null;
  scopes: string[];
  pages: FacebookPage[];
}): Promise<SocialAccount[]> {
  const saved: SocialAccount[] = [];
  const seenInstagramIds = new Set<string>();

  for (const page of input.pages) {
    const pageAccessToken = page.access_token ?? input.longLivedUserToken;
    const instagram = await fetchInstagramBusinessAccount(page.id, pageAccessToken);
    if (!instagram || seenInstagramIds.has(instagram.id)) {
      continue;
    }

    seenInstagramIds.add(instagram.id);
    saved.push(
      await saveInstagramAccount({
        workspaceId: input.workspaceId,
        userId: input.userId,
        longLivedUserToken: input.longLivedUserToken,
        pageAccessToken,
        tokenExpiresAt: input.tokenExpiresAt,
        scopes: input.scopes,
        page,
        instagram
      })
    );
  }

  return saved;
}

async function saveInstagramAccount(input: {
  workspaceId: string;
  userId: string;
  longLivedUserToken: string;
  pageAccessToken: string;
  tokenExpiresAt: Date | null;
  scopes: string[];
  page: FacebookPage;
  instagram: InstagramBusinessAccount;
}): Promise<SocialAccount> {
  const metadata = {
    instagramBusinessAccountId: input.instagram.id,
    igId: input.instagram.ig_id ?? null,
    biography: input.instagram.biography ?? null,
    website: input.instagram.website ?? null,
    followsCount: input.instagram.follows_count ?? 0,
    mediaCount: input.instagram.media_count ?? 0,
    profilePictureUrl: input.instagram.profile_picture_url ?? null,
    linkedPageId: input.page.id,
    linkedPageName: input.page.name
  };

  return upsertMetaAccount({
    workspaceId: input.workspaceId,
    userId: input.userId,
    platform: "instagram",
    platformUserId: input.instagram.id,
    username: input.instagram.username ?? null,
    handle: input.instagram.username ?? input.instagram.id,
    displayName: input.instagram.name ?? input.instagram.username ?? "Instagram Account",
    followerCount: input.instagram.followers_count ?? 0,
    accessToken: input.longLivedUserToken,
    pageAccessToken: input.pageAccessToken,
    tokenExpiresAt: input.tokenExpiresAt,
    scopes: input.scopes,
    metadata
  });
}

// ── Generic account upsert ──────────────────────────────────

async function saveAccount(input: {
  workspaceId: string;
  userId: string;
  platform: SocialPlatform;
  platformUserId: string;
  username: string | null;
  handle: string;
  displayName: string;
  followerCount: number;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt: Date | null;
  scopes: string[];
  metadata: Prisma.InputJsonValue;
}): Promise<SocialAccount> {
  const existing = await prisma.socialAccount.findFirst({
    where: { workspaceId: input.workspaceId, platform: input.platform, platformUserId: input.platformUserId },
  });

  const data = {
    userId: input.userId,
    username: input.username,
    handle: input.handle,
    displayName: input.displayName,
    connected: true,
    connectedAt: new Date(),
    followerCount: input.followerCount,
    accessToken: encryptToken(input.accessToken),
    refreshToken: input.refreshToken ? encryptToken(input.refreshToken) : undefined,
    tokenExpiresAt: input.tokenExpiresAt,
    scopes: input.scopes,
    metadata: input.metadata,
    platformMetadata: input.metadata,
  };

  if (existing) {
    return prisma.socialAccount.update({ where: { id: existing.id }, data });
  }

  return prisma.socialAccount.create({
    data: { workspaceId: input.workspaceId, platform: input.platform, platformUserId: input.platformUserId, ...data },
  });
}

// ── LinkedIn ─────────────────────────────────────────────────

export async function connectLinkedIn(input: {
  workspaceId: string;
  userId: string;
  code: string;
}): Promise<PublicSocialAccount> {
  const token = await linkedin.exchangeCodeForToken(input.code);
  const userInfo = await linkedin.fetchUserInfo(token.access_token);
  const metadata = { email: userInfo.email, pictureUrl: userInfo.picture };

  const account = await saveAccount({
    workspaceId: input.workspaceId,
    userId: input.userId,
    platform: "linkedin",
    platformUserId: userInfo.sub,
    username: null,
    handle: userInfo.name,
    displayName: userInfo.name,
    followerCount: 0,
    accessToken: token.access_token,
    tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    scopes: ((token as { scope?: string }).scope ?? "").split(" ").filter(Boolean),
    metadata,
  });

  await triggerSocialResearch(input.workspaceId, "linkedin", {
    display_name: userInfo.name,
    ...metadata,
  });

  return serializePublicSocialAccount(account);
}

// ── X/Twitter ────────────────────────────────────────────────

export async function connectTwitter(input: {
  workspaceId: string;
  userId: string;
  code: string;
  codeVerifier: string;
}): Promise<PublicSocialAccount> {
  const token = await twitter.exchangeCodeForToken(input.code, input.codeVerifier);
  const userInfo = await twitter.fetchUserInfo(token.access_token);

  const account = await saveAccount({
    workspaceId: input.workspaceId,
    userId: input.userId,
    platform: "twitter",
    platformUserId: userInfo.id,
    username: userInfo.username,
    handle: `@${userInfo.username}`,
    displayName: userInfo.name,
    followerCount: 0,
    accessToken: token.access_token,
    refreshToken: (token as { refresh_token?: string }).refresh_token,
    tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    scopes: token.scope.split(" ").filter(Boolean),
    metadata: { profileImageUrl: userInfo.profile_image_url },
  });

  await triggerSocialResearch(input.workspaceId, "twitter", {
    display_name: userInfo.name,
    username: userInfo.username,
    bio: userInfo.description,
    follower_count: userInfo.public_metrics?.followers_count,
    media_count: userInfo.public_metrics?.tweet_count,
  });

  return serializePublicSocialAccount(account);
}

// ── TikTok ───────────────────────────────────────────────────

export async function connectTikTok(input: {
  workspaceId: string;
  userId: string;
  code: string;
}): Promise<PublicSocialAccount> {
  const token = await tiktok.exchangeCodeForToken(input.code);
  const userInfo = await tiktok.fetchUserInfo(token.access_token);

  const account = await saveAccount({
    workspaceId: input.workspaceId,
    userId: input.userId,
    platform: "tiktok",
    platformUserId: userInfo.open_id,
    username: null,
    handle: userInfo.display_name ?? userInfo.open_id,
    displayName: userInfo.display_name ?? "TikTok Account",
    followerCount: userInfo.follower_count ?? 0,
    accessToken: token.access_token,
    refreshToken: (token as { refresh_token?: string }).refresh_token,
    tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    scopes: (token.scope ?? "").split(" ").filter(Boolean),
    metadata: { avatarUrl: userInfo.avatar_url, bio: userInfo.bio_description },
  });

  await triggerSocialResearch(input.workspaceId, "tiktok", {
    display_name: userInfo.display_name,
    username: userInfo.display_name,
    bio: userInfo.bio_description,
    follower_count: userInfo.follower_count,
  });

  return serializePublicSocialAccount(account);
}

// ── YouTube ──────────────────────────────────────────────────

export async function connectYouTube(input: {
  workspaceId: string;
  userId: string;
  code: string;
}): Promise<PublicSocialAccount> {
  const token = await youtube.exchangeCodeForToken(input.code);
  const channel = await youtube.fetchMyChannel(token.access_token);

  const account = await saveAccount({
    workspaceId: input.workspaceId,
    userId: input.userId,
    platform: "youtube",
    platformUserId: channel.id,
    username: null,
    handle: channel.title,
    displayName: channel.title,
    followerCount: Number(channel.statistics?.subscriberCount ?? 0),
    accessToken: token.access_token,
    refreshToken: (token as { refresh_token?: string }).refresh_token,
    tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    scopes: token.scope.split(" ").filter(Boolean),
    metadata: {
      description: channel.description,
      thumbnails: channel.thumbnails,
      videoCount: channel.statistics?.videoCount,
      viewCount: channel.statistics?.viewCount,
    },
  });

  await triggerSocialResearch(input.workspaceId, "youtube", {
    display_name: channel.title,
    description: channel.description,
    follower_count: Number(channel.statistics?.subscriberCount ?? 0),
    video_count: Number(channel.statistics?.videoCount ?? 0),
    view_count: Number(channel.statistics?.viewCount ?? 0),
  });

  return serializePublicSocialAccount(account);
}

export async function connectMetaAccounts(input: {
  workspaceId: string;
  userId: string;
  platform: MetaPlatform;
  shortLivedToken: string;
}): Promise<{
  facebookAccounts: PublicSocialAccount[];
  instagramAccounts: PublicSocialAccount[];
}> {
  const longLivedToken = await exchangeForLongLivedToken(input.shortLivedToken);
  const token = longLivedToken.access_token;
  const debug = await debugToken(token);
  const scopes = debug.data?.scopes?.length
    ? debug.data.scopes
    : scopesFor(input.platform);
  const tokenExpiresAt =
    debug.data?.expires_at && debug.data.expires_at > 0
      ? new Date(debug.data.expires_at * 1000)
      : tokenExpiryFromResponse(longLivedToken);

  const pages = await fetchFacebookPages(token);
  if (pages.length === 0) {
    throw new ApiError(
      422,
      "no_facebook_pages",
      "No Facebook Pages were returned for this Meta account."
    );
  }

  const facebookAccounts =
    input.platform === "facebook"
      ? await saveFacebookPages({
          workspaceId: input.workspaceId,
          userId: input.userId,
          longLivedUserToken: token,
          tokenExpiresAt,
          scopes,
          pages
        })
      : [];

  const instagramAccounts =
    input.platform === "instagram"
      ? await saveInstagramAccounts({
          workspaceId: input.workspaceId,
          userId: input.userId,
          longLivedUserToken: token,
          tokenExpiresAt,
          scopes,
          pages
        })
      : [];

  if (input.platform === "instagram" && instagramAccounts.length === 0) {
    throw new ApiError(
      422,
      "no_instagram_business_account",
      "No Instagram Business or Creator account linked to the authorized Facebook Pages was found."
    );
  }

  for (const fb of facebookAccounts) {
    await triggerSocialResearch(input.workspaceId, "facebook", {
      display_name: fb.displayName,
      follower_count: fb.followerCount,
    });
  }

  for (const ig of instagramAccounts) {
    await triggerSocialResearch(input.workspaceId, "instagram", {
      display_name: ig.displayName,
      follower_count: ig.followerCount,
    });
  }

  return {
    facebookAccounts: facebookAccounts.map(serializePublicSocialAccount),
    instagramAccounts: instagramAccounts.map(serializePublicSocialAccount)
  };
}

export async function connectInstagramBasicAccount(input: {
  workspaceId: string;
  userId: string;
  code: string;
}): Promise<PublicSocialAccount> {
  const token = await instagramBasic.exchangeCodeForToken(input.code);
  const longLived = await instagramBasic.exchangeForLongLivedToken(token.access_token);
  const profile = await instagramBasic.fetchUserProfile(longLived.access_token);

  const metadata = {
    igUserId: profile.user_id,
    accountType: profile.account_type ?? null,
    profilePictureUrl: profile.profile_picture_url ?? null
  };

  const account = await saveAccount({
    workspaceId: input.workspaceId,
    userId: input.userId,
    platform: "instagram-basic",
    platformUserId: String(profile.user_id),
    username: profile.username,
    handle: profile.username,
    displayName: profile.name ?? profile.username ?? "Instagram Account",
    followerCount: 0,
    accessToken: longLived.access_token,
    tokenExpiresAt: new Date(Date.now() + (longLived.expires_in ?? 60 * 24 * 3600) * 1000),
    scopes: instagramBasic.instagramBasicScopes,
    metadata
  });

  await triggerSocialResearch(input.workspaceId, "instagram", {
    display_name: profile.username,
    username: profile.username,
    bio: (profile as any).biography,
  });

  return serializePublicSocialAccount(account);
}

async function findFirstBrand(workspaceId: string): Promise<string | null> {
  const brand = await prisma.brand.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
  return brand?.id ?? null;
}

async function triggerSocialResearch(workspaceId: string, platform: string, metadata: Record<string, unknown>) {
  try {
    const brandId = await findFirstBrand(workspaceId);
    if (!brandId) return;

    const result = await researchSocialProfile({
      platform,
      display_name: (metadata.display_name as string) ?? (metadata.handle as string) ?? "",
      username: (metadata.username as string) ?? undefined,
      follower_count: (metadata.follower_count as number) ?? 0,
      bio: (metadata.bio as string) ?? undefined,
      description: (metadata.description as string) ?? undefined,
      media_count: (metadata.media_count as number) ?? undefined,
      video_count: (metadata.video_count as number) ?? undefined,
      view_count: (metadata.view_count as number) ?? undefined,
      website: (metadata.website as string) ?? undefined,
    });

    const insights = [
      { title: `${platform} Profile Summary`, content: result.profile_summary, category: "profile" },
      { title: `${platform} Audience`, content: result.audience_description, category: "audience" },
      { title: `${platform} Brand Voice`, content: result.suggested_brand_voice, category: "voice" },
      ...result.insights.map((insight) => ({
        title: `${platform}: ${insight.category}`,
        content: insight.finding,
        category: insight.category,
      })),
    ];

    for (const insight of insights) {
      await prisma.brandMemoryEntry.create({
        data: {
          workspaceId,
          brandId,
          title: insight.title,
          content: insight.content,
          tags: [platform, "auto-research", insight.category],
          source: "social_research",
        },
      });
    }
  } catch {
    // Non-critical: research failure shouldn't block connection
  }
}

export async function disconnectSocialAccount(input: {
  id: string;
  workspaceId: string;
  userId?: string;
}): Promise<void> {
  const account = await prisma.socialAccount.findFirst({
    where: {
      id: input.id,
      workspaceId: input.workspaceId,
      ...(input.userId ? { userId: input.userId } : {})
    }
  });

  if (!account) {
    throw new ApiError(404, "not_found", "Connected social account was not found.");
  }

  await prisma.socialAccount.delete({ where: { id: input.id } });
}

export async function refreshExpiringMetaTokens(): Promise<{
  checked: number;
  refreshed: number;
  failed: number;
}> {
  const expiringBefore = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accounts = await prisma.socialAccount.findMany({
    where: {
      connected: true,
      platform: { in: ["facebook", "instagram"] },
      accessToken: { not: null },
      OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { lte: expiringBefore } }]
    }
  });

  let refreshed = 0;
  let failed = 0;

  for (const account of accounts) {
    try {
      const currentToken = decryptToken(account.accessToken!);
      const nextToken = await exchangeForLongLivedToken(currentToken);
      const tokenExpiresAt = tokenExpiryFromResponse(nextToken);

      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessToken: encryptToken(nextToken.access_token),
          tokenExpiresAt: tokenExpiresAt ?? account.tokenExpiresAt
        }
      });
      refreshed += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    checked: accounts.length,
    refreshed,
    failed
  };
}
