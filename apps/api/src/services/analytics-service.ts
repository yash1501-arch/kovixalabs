import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";

function periodDays(period: string): number {
  if (period === "7d") return 7;
  if (period === "90d") return 90;
  return 30;
}

export async function ensureAnalyticsSeeded(workspaceId: string) {
  const existing = await prisma.analyticsRecord.findFirst({ where: { workspaceId } });
  if (existing) return;

  const posts = await prisma.post.findMany({
    where: { workspaceId, status: "PUBLISHED" },
    select: { id: true, platform: true, publishedAt: true, createdAt: true },
  });

  if (posts.length === 0) {
    const now = new Date();
    const records = [];
    for (let i = 90; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      records.push({
        workspaceId,
        platform: "instagram",
        date,
        impressions: Math.floor(Math.random() * 3000) + 500,
        reach: Math.floor(Math.random() * 2000) + 300,
        engagements: Math.floor(Math.random() * 200) + 20,
        likes: Math.floor(Math.random() * 150) + 10,
        comments: Math.floor(Math.random() * 30) + 1,
        shares: Math.floor(Math.random() * 50) + 1,
        saves: Math.floor(Math.random() * 40) + 1,
        clicks: Math.floor(Math.random() * 100) + 5,
        followerDelta: Math.floor(Math.random() * 20) - 5,
        source: "demo",
      });
    }
    await prisma.analyticsRecord.createMany({ data: records });
    return;
  }

  const records = [];
  for (const post of posts) {
    const date = post.publishedAt ?? post.createdAt;
    records.push({
      workspaceId,
      postId: post.id,
      platform: post.platform,
      date,
      impressions: Math.floor(Math.random() * 3000) + 500,
      reach: Math.floor(Math.random() * 2000) + 300,
      engagements: Math.floor(Math.random() * 200) + 20,
      likes: Math.floor(Math.random() * 150) + 10,
      comments: Math.floor(Math.random() * 30) + 1,
      shares: Math.floor(Math.random() * 50) + 1,
      saves: Math.floor(Math.random() * 40) + 1,
      clicks: Math.floor(Math.random() * 100) + 5,
      followerDelta: Math.floor(Math.random() * 20) - 5,
      source: "demo",
    });
  }
  await prisma.analyticsRecord.createMany({ data: records });
}

export async function getWorkspaceStats(workspaceId: string, period = "30d") {
  const days = periodDays(period);
  const since = new Date(Date.now() - days * 86400000);
  await ensureAnalyticsSeeded(workspaceId);

  const [posts, analytics] = await Promise.all([
    prisma.post.findMany({
      where: { workspaceId },
      select: { status: true, platform: true, publishedAt: true, createdAt: true },
    }),
    prisma.analyticsRecord.findMany({
      where: { workspaceId, date: { gte: since } },
      orderBy: { date: "asc" },
    }),
  ]);

  const published = posts.filter((p) => p.status === "PUBLISHED");
  const scheduled = posts.filter((p) => p.status === "SCHEDULED");
  const failed = posts.filter((p) => p.status === "FAILED");

  const totalImpressions = analytics.reduce((s, r) => s + r.impressions, 0);
  const totalEngagements = analytics.reduce((s, r) => s + r.engagements, 0);
  const totalReach = analytics.reduce((s, r) => s + r.reach, 0);

  const platformMap = new Map<string, { posts: number; impressions: number; engagements: number }>();
  for (const r of analytics) {
    const entry = platformMap.get(r.platform) ?? { posts: 0, impressions: 0, engagements: 0 };
    entry.impressions += r.impressions;
    entry.engagements += r.engagements;
    platformMap.set(r.platform, entry);
  }
  for (const p of posts) {
    const entry = platformMap.get(p.platform) ?? { posts: 0, impressions: 0, engagements: 0 };
    entry.posts++;
    platformMap.set(p.platform, entry);
  }

  function dateKey(d: Date): string {
    return d.toISOString().split("T")[0] ?? "";
  }

  const daysArray: Array<{ date: string; impressions: number; engagements: number }> = [];
  const analyticsByDate = new Map<string, { impressions: number; engagements: number }>();
  for (const r of analytics) {
    const key = dateKey(r.date);
    const existing = analyticsByDate.get(key) ?? { impressions: 0, engagements: 0 };
    existing.impressions += r.impressions;
    existing.engagements += r.engagements;
    analyticsByDate.set(key, existing);
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = dateKey(d);
    const data = analyticsByDate.get(key) ?? { impressions: 0, engagements: 0 };
    daysArray.push({ date: key, impressions: data.impressions, engagements: data.engagements });
  }

  return {
    workspaceId,
    period,
    totalPosts: posts.length,
    publishedPosts: published.length,
    scheduledPosts: scheduled.length,
    draftPosts: posts.length - published.length - failed.length - scheduled.length,
    totalImpressions,
    totalEngagements,
    totalReach,
    engagementRate: totalImpressions > 0 ? Number((totalEngagements / totalImpressions * 100).toFixed(2)) : 0,
    platformBreakdown: Array.from(platformMap.entries()).map(([platform, data]) => ({
      platform,
      posts: data.posts,
      impressions: data.impressions,
      engagements: data.engagements,
    })),
    dailyStats: daysArray,
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
  const postIds = publishedPosts.map((p) => p.id);
  const analytics = postIds.length > 0
    ? await prisma.analyticsRecord.findMany({ where: { postId: { in: postIds } } })
    : [];

  const platformBreakdown: Record<string, { total: number; published: number; failed: number; impressions: number; engagements: number }> = {};
  for (const post of brand.posts) {
    if (!platformBreakdown[post.platform]) {
      platformBreakdown[post.platform] = { total: 0, published: 0, failed: 0, impressions: 0, engagements: 0 };
    }
    const entry = platformBreakdown[post.platform]!;
    entry.total++;
    if (post.status === "PUBLISHED") entry.published++;
    if (post.status === "FAILED") entry.failed++;
  }
  for (const a of analytics) {
    const entry = platformBreakdown[a.platform];
    if (entry) {
      entry.impressions += a.impressions;
      entry.engagements += a.engagements;
    }
  }

  return {
    brandId: brand.id,
    brandName: brand.name,
    totalPosts: brand.posts.length,
    publishedPosts: publishedPosts.length,
    totalImpressions: analytics.reduce((s, r) => s + r.impressions, 0),
    totalEngagements: analytics.reduce((s, r) => s + r.engagements, 0),
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

  const postIds = posts.map((p) => p.id);
  const analytics = postIds.length > 0
    ? await prisma.analyticsRecord.findMany({
        where: { postId: { in: postIds } },
        select: { postId: true, likes: true, comments: true, shares: true, impressions: true, reach: true, saves: true },
      })
    : [];
  const analyticsByPostId = new Map(analytics.map((a) => [a.postId, a]));

  const records = posts.map((p) => {
    const a = analyticsByPostId.get(p.id);
    const impressions = a?.impressions ?? 0;
    const engagements = (a?.likes ?? 0) + (a?.comments ?? 0) + (a?.shares ?? 0);
    return {
      post_id: p.id,
      platform: p.platform,
      likes: a?.likes ?? 0,
      comments: a?.comments ?? 0,
      shares: a?.shares ?? 0,
      impressions,
      reach: a?.reach ?? 0,
      saves: a?.saves ?? 0,
      engagement_rate: impressions > 0 ? Number((engagements / impressions * 100).toFixed(2)) : 0,
      posted_at: p.publishedAt?.toISOString() ?? new Date().toISOString(),
    };
  });

  return records;
}

export async function recordAnalytics(data: {
  workspaceId: string;
  brandId?: string;
  postId?: string;
  platform: string;
  date: Date;
  impressions: number;
  reach: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  followerDelta: number;
  source?: string;
}) {
  return prisma.analyticsRecord.create({ data: { ...data, source: data.source ?? "api" } });
}

export async function ingestPlatformAnalytics(
  workspaceId: string,
  platform: string,
  metrics: Array<{
    postId?: string;
    date: Date;
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    followerDelta: number;
  }>,
) {
  const records = metrics.map((m) => ({
    workspaceId,
    postId: m.postId ?? null,
    platform,
    date: m.date,
    impressions: m.impressions,
    reach: m.reach,
    engagements: m.likes + m.comments + m.shares,
    likes: m.likes,
    comments: m.comments,
    shares: m.shares,
    saves: m.saves,
    clicks: 0,
    followerDelta: m.followerDelta,
    source: "platform_api",
  }));
  await prisma.analyticsRecord.createMany({ data: records });
}
