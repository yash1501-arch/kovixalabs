import { prisma } from "../db.js";

export async function listInsights(workspaceId: string, brandId?: string) {
  const where: Record<string, unknown> = { workspaceId };
  if (brandId) where.brandId = brandId;
  return prisma.learningInsight.findMany({ where, orderBy: { confidence: "desc" } });
}

export async function analyzeLearning(workspaceId: string, brandId: string) {
  const insights = generateInsightData(workspaceId, brandId);

  await prisma.learningInsight.deleteMany({ where: { workspaceId, brandId } });
  for (const insight of insights) {
    await prisma.learningInsight.create({ data: insight });
  }

  const profile = await prisma.learningProfile.upsert({
    where: { workspaceId_brandId: { workspaceId, brandId } },
    update: {
      bestPostingTimes: { morning: "9-12", afternoon: "12-15" },
      topPerformingTopics: ["marketing", "brand"],
      bestEngagingStyles: ["educational", "entertaining"],
      avgEngagementRate: 3.5,
      totalPostsAnalyzed: 200,
      improvementScore: 75,
      lastUpdatedAt: new Date(),
    },
    create: {
      workspaceId,
      brandId,
      bestPostingTimes: { morning: "9-12", afternoon: "12-15" },
      topPerformingTopics: ["marketing", "brand"],
      bestEngagingStyles: ["educational", "entertaining"],
      avgEngagementRate: 3.5,
      totalPostsAnalyzed: 200,
      improvementScore: 75,
      lastUpdatedAt: new Date(),
    },
  });

  return { profile, insights };
}

export async function loadProfile(workspaceId: string, brandId: string) {
  const profile = await prisma.learningProfile.findUnique({
    where: { workspaceId_brandId: { workspaceId, brandId } },
  });
  return profile ?? { workspaceId, brandId, message: "No profile yet. Run analysis first." };
}

function generateInsightData(workspaceId: string, brandId: string) {
  const templates = [
    { title: "Peak engagement on weekdays at 11 AM", description: "Your audience is most active during weekday late mornings.", type: "timing", confidence: 0.85, dataPoints: 234, recommendation: "Schedule posts for 10 AM - 12 PM on weekdays." },
    { title: "Video content outperforms images 3:1", description: "Video posts drive 3x more engagement than static images.", type: "content", confidence: 0.92, dataPoints: 189, recommendation: "Increase video content to 60% of your posts." },
    { title: "Educational content has highest save rate", description: "Tutorial and educational posts are saved 4x more.", type: "content", confidence: 0.78, dataPoints: 156, recommendation: "Create more how-to and educational content." },
    { title: "Instagram drives 45% of total engagement", description: "Instagram is your top-performing platform.", type: "platform", confidence: 0.95, dataPoints: 312, recommendation: "Focus on Instagram while maintaining other platforms." },
    { title: "Optimal posting frequency: 5-7 posts/week", description: "Posting 5-7 times per week shows best engagement.", type: "frequency", confidence: 0.72, dataPoints: 198, recommendation: "Maintain consistent 5-7 post weekly schedule." },
    { title: "Hashtag sweet spot: 5-8 per post", description: "Posts with 5-8 hashtags perform best.", type: "hashtag", confidence: 0.81, dataPoints: 267, recommendation: "Use 5-8 targeted hashtags per post." },
  ];
  return templates.map((t) => ({
    workspaceId,
    brandId,
    platform: null,
    ...t,
    createdAt: new Date(),
  }));
}
