import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";

export interface EngagementStats {
  totalPosts: number;
  publishedPosts: number;
  failedPosts: number;
  scheduledPosts: number;
  draftPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagementRate: number;
}

export async function getWorkspaceStats(workspaceId: string): Promise<EngagementStats> {
  const posts = await prisma.post.findMany({
    where: { workspaceId },
    select: { status: true },
  });

  const published = posts.filter((p) => p.status === "PUBLISHED").length;
  const failed = posts.filter((p) => p.status === "FAILED").length;
  const scheduled = posts.filter((p) => p.status === "SCHEDULED").length;

  return {
    totalPosts: posts.length,
    publishedPosts: published,
    failedPosts: failed,
    scheduledPosts: scheduled,
    draftPosts: posts.length - published - failed - scheduled,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    avgEngagementRate: 0,
  };
}

export async function getBrandPerformance(brandId: string) {
  const brand = await prisma.brand.findFirst({
    where: { id: brandId },
    include: {
      posts: {
        orderBy: { publishedAt: "desc" },
        take: 50,
      },
    },
  });

  if (!brand) throw new ApiError(404, "brand_not_found", "Brand not found.");

  const publishedPosts = brand.posts.filter((p) => p.status === "PUBLISHED");
  const platformBreakdown: Record<string, { total: number; published: number; failed: number }> = {};

  for (const post of brand.posts) {
    const pb = platformBreakdown[post.platform];
    if (!pb) {
      platformBreakdown[post.platform] = { total: 0, published: 0, failed: 0 };
    }
    const entry = platformBreakdown[post.platform]!;
    entry.total++;
    if (post.status === "PUBLISHED") entry.published++;
    if (post.status === "FAILED") entry.failed++;
  }

  return {
    brandId: brand.id,
    brandName: brand.name,
    totalPosts: brand.posts.length,
    publishedPosts: publishedPosts.length,
    platformBreakdown,
    recentPosts: publishedPosts.slice(0, 10).map((p) => ({
      id: p.id,
      platform: p.platform,
      caption: p.caption?.slice(0, 200),
      hashtags: p.hashtags,
      publishedAt: p.publishedAt?.toISOString(),
    })),
  };
}

export async function analyzeEngagement(input: {
  workspaceId: string;
  brandId: string;
  platform?: string;
}) {
  const { brandId, platform } = input;

  const where: Record<string, unknown> = { brandId, status: "PUBLISHED" };
  if (platform) where.platform = platform;

  const posts = await prisma.post.findMany({
    where: where as any,
    orderBy: { publishedAt: "desc" },
    take: 100,
    select: {
      id: true,
      platform: true,
      caption: true,
      hashtags: true,
      publishedAt: true,
    },
  });

  const records = posts.map((p) => ({
    post_id: p.id,
    platform: p.platform,
    likes: 0,
    comments: 0,
    shares: 0,
    impressions: 0,
    reach: 0,
    saves: 0,
    engagement_rate: 0,
    posted_at: p.publishedAt?.toISOString() ?? new Date().toISOString(),
  }));

  return records;
}
