import { prisma } from "../../db.js";
import { decryptToken } from "../../utils/token-encryption.js";
import { ApiError } from "../../utils/api-error.js";
import { createMemoryEntry } from "../brand-service.js";
import { platformScrapers, type ScrapedProfile } from "./platform-scrapers.js";
import type { SocialPlatform } from "../social-account-service.js";

export interface AuditResult {
  workspaceId: string;
  brandId: string;
  scannedAccounts: number;
  profiles: ScrapedProfile[];
  insightsCreated: number;
  insights: string[];
  completedAt: string;
}

export interface SocialAccountAuditResult {
  platform: string;
  score: number;
  auditedAt: string;
  metrics: {
    followers: number;
    avgEngagementRate: number;
    postsCount: number;
    postFrequency: string;
  };
  profileDetails: Record<string, unknown>;
  strengths: string[];
  opportunities: string[];
}

function generateStrengths(profile: ScrapedProfile, platform: string): string[] {
  const s: string[] = [];
  if (profile.followerCount > 1000) s.push("Strong follower base with meaningful reach potential.");
  if (profile.followerCount > 10000) s.push("Established audience — your content has significant organic reach.");
  if (profile.recentPosts.length > 5) s.push(`Consistent content output — ${profile.recentPosts.length} recent posts scanned.`);
  const totalLikes = profile.recentPosts.reduce((sum, p) => sum + p.likes, 0);
  const totalComments = profile.recentPosts.reduce((sum, p) => sum + p.comments, 0);
  if (totalLikes > 100) s.push("Posts generate solid engagement with strong like counts.");
  if (totalComments > 10) s.push("Active comment section indicates high community involvement.");
  const hashtagCount = profile.recentPosts.filter(p => p.hashtags.length > 0).length;
  if (hashtagCount > 3) s.push("Hashtag strategy in use — discoverability is being supported.");
  if (s.length === 0) s.push("Profile is set up and ready for optimization.");
  return s;
}

function generateOpportunities(profile: ScrapedProfile, platform: string): string[] {
  const o: string[] = [];
  if (profile.followerCount < 5000) o.push("Focus on growing your audience through consistent, value-driven content.");
  if (profile.recentPosts.length < 5) o.push("Increase posting frequency to build momentum and algorithmic favorability.");
  const totalLikes = profile.recentPosts.reduce((sum, p) => sum + p.likes, 0);
  const totalComments = profile.recentPosts.reduce((sum, p) => sum + p.comments, 0);
  if (totalLikes < 50) o.push("Experiment with new content formats (Reels, Stories, Carousels) to boost engagement.");
  if (totalComments < 5) o.push("Encourage conversation by adding question prompts and CTAs in captions.");
  const postWithMedia = profile.recentPosts.filter(p => p.mediaUrls.length > 0).length;
  if (postWithMedia < 3) o.push("Incorporate more visual media (images, video) — posts with media perform significantly better.");
  if (platform === "instagram") o.push("Leverage Instagram Reels for short-form video to reach new audiences.");
  o.push("Schedule weekly content themes to maintain brand consistency and audience anticipation.");
  return o;
}

function calculateScore(profile: ScrapedProfile): number {
  let score = 50;
  if (profile.followerCount > 1000) score += 5;
  if (profile.followerCount > 10000) score += 5;
  if (profile.followerCount > 100000) score += 5;
  if (profile.recentPosts.length > 3) score += 5;
  if (profile.recentPosts.length > 7) score += 5;
  const avgLikes = profile.recentPosts.reduce((sum, p) => sum + p.likes, 0) / Math.max(profile.recentPosts.length, 1);
  if (avgLikes > 10) score += 5;
  if (avgLikes > 50) score += 5;
  if (avgLikes > 200) score += 5;
  const avgComments = profile.recentPosts.reduce((sum, p) => sum + p.comments, 0) / Math.max(profile.recentPosts.length, 1);
  if (avgComments > 2) score += 5;
  if (avgComments > 10) score += 5;
  const postWithMedia = profile.recentPosts.filter(p => p.mediaUrls.length > 0).length;
  if (postWithMedia > 3) score += 5;
  return Math.min(score, 100);
}

function determineFrequency(profile: ScrapedProfile): string {
  if (profile.recentPosts.length < 3) return "Inconsistent";
  const dates = profile.recentPosts
    .map(p => new Date(p.postedAt).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => b - a);
  if (dates.length < 2) return "Unknown";
  const gaps: number[] = [];
  for (let i = 0; i < dates.length - 1; i++) {
    gaps.push((dates[i]! - dates[i + 1]!) / 86400000);
  }
  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  if (avgGap <= 1) return "Daily";
  if (avgGap <= 3) return "Several times a week";
  if (avgGap <= 7) return "Weekly";
  return "Occasional";
}

export async function runBrandAudit(workspaceId: string, brandId: string): Promise<AuditResult> {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, workspaceId } });
  if (!brand) throw new ApiError(404, "brand_not_found", "Brand not found in workspace.");

  const accounts = await prisma.socialAccount.findMany({
    where: { workspaceId, connected: true },
  });

  if (accounts.length === 0) {
    throw new ApiError(400, "no_connected_accounts", "No connected social accounts found. Connect at least one account first.");
  }

  const profiles: ScrapedProfile[] = [];
  const allInsights: string[] = [];

  for (const account of accounts) {
    try {
      const platform = account.platform as SocialPlatform;
      const scraper = platformScrapers[platform];
      if (!scraper) continue;

      const token = account.accessToken ? decryptToken(account.accessToken) : "mock-token";

      const acct = account as any;
      let profile: ScrapedProfile;
      if (platform === "facebook") {
        const pageToken = acct.pageAccessToken ? decryptToken(acct.pageAccessToken) : undefined;
        profile = await scraper(token, acct.platformUserId, pageToken);
      } else {
        profile = await scraper(token, acct.platformUserId);
      }

      profile.displayName = acct.displayName || profile.displayName;
      profile.username = acct.username || profile.username;
      profiles.push(profile);

      const insight = `Audited ${platform} account "${profile.displayName}": ${profile.followerCount} followers, ${profile.recentPosts.length} recent posts scanned.`;
      allInsights.push(insight);
    } catch (err) {
      allInsights.push(`Failed to audit ${account.platform} account "${account.displayName}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const insightEntry = await createMemoryEntry(brandId, {
    title: `Brand Audit — ${new Date().toISOString().split("T")[0]}`,
    content: allInsights.join("\n"),
    tags: ["audit", ...profiles.map((p) => p.username).filter(Boolean)],
    source: "audit_engine",
  });

  return {
    workspaceId,
    brandId,
    scannedAccounts: accounts.length,
    profiles,
    insightsCreated: 1,
    insights: allInsights,
    completedAt: new Date().toISOString(),
  };
}

export async function runSocialAccountAudit(accountId: string, workspaceId: string): Promise<SocialAccountAuditResult> {
  const account = await prisma.socialAccount.findFirst({
    where: { id: accountId, workspaceId, connected: true },
  });
  if (!account) throw new ApiError(404, "account_not_found", "Social account not found or not connected.");

  const platform = account.platform as SocialPlatform;
  const scraper = platformScrapers[platform];
  if (!scraper) throw new ApiError(400, "unsupported_platform", `Audit not supported for platform: ${platform}`);

  const token = account.accessToken ? decryptToken(account.accessToken) : "mock-token";
  const acct = account as any;
  const profile = platform === "facebook" && acct.pageAccessToken
    ? await scraper(token, acct.platformUserId, decryptToken(acct.pageAccessToken))
    : await scraper(token, acct.platformUserId);

  const strengths = generateStrengths(profile, platform);
  const opportunities = generateOpportunities(profile, platform);
  const score = calculateScore(profile);
  const postFrequency = determineFrequency(profile);

  const profileDetails: Record<string, unknown> = {
    biography: profile.recentPosts[0]?.caption ?? undefined,
    website: undefined,
    category: undefined,
    followsCount: profile.followingCount,
    mediaCount: profile.postCount,
  };

  return {
    platform,
    score,
    auditedAt: new Date().toISOString(),
    metrics: {
      followers: profile.followerCount,
      avgEngagementRate: profile.recentPosts.length > 0
        ? Math.round(
            (profile.recentPosts.reduce((sum, p) => sum + p.likes + p.comments, 0) /
              Math.max(profile.followerCount, 1)) * 100 * 10
          ) / 10
        : 0,
      postsCount: profile.postCount,
      postFrequency,
    },
    profileDetails,
    strengths,
    opportunities,
  };
}
