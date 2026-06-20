import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";

export async function listTrends(workspaceId: string) {
  return prisma.trend.findMany({
    where: { workspaceId },
    orderBy: { score: "desc" },
  });
}

export async function seedTrends(workspaceId: string) {
  await prisma.workspace.upsert({
    where: { id: workspaceId },
    update: {},
    create: { id: workspaceId, name: workspaceId, slug: workspaceId },
  });
  const existing = await prisma.trend.findFirst({ where: { workspaceId } });
  if (existing) return;

  const topics = [
    "AI Marketing", "Short-Form Video", "UGC Content", "Social Commerce",
    "AR Filters", "Voice Search", "Sustainability", "Micro-Influencers",
    "Interactive Content", "Personalization", "Ephemeral Content", "Shoppable Posts",
  ];
  const now = new Date();
  const velocities = ["rising", "peak", "declining"] as const;

  await prisma.trend.createMany({
    data: topics.map((topic) => ({
      workspaceId,
      topic,
      platform: null,
      category: "content",
      score: Math.floor(40 + Math.random() * 60),
      velocity: velocities[Math.floor(Math.random() * 3)]!,
      hashtags: [`#${topic.replace(/\s+/g, "")}`, "#trending"],
      relatedTopics: topics.filter(() => Math.random() > 0.7),
      estimatedReach: Math.floor(10000 + Math.random() * 500000),
      engagementPotential: ["high", "medium", "low"][Math.floor(Math.random() * 3)]!,
      createdAt: now,
      updatedAt: now,
    })),
  });
}

export async function refreshTrends(workspaceId: string) {
  const existing = await prisma.trend.findMany({ where: { workspaceId } });
  const now = new Date();
  const velocities = ["rising", "peak", "declining"] as const;

  for (const trend of existing) {
    await prisma.trend.update({
      where: { id: trend.id },
      data: {
        score: Math.floor(50 + Math.random() * 50),
        velocity: velocities[Math.floor(Math.random() * 3)]!,
        estimatedReach: Math.floor(10000 + Math.random() * 500000),
        updatedAt: now,
      },
    });
  }
  return prisma.trend.findMany({ where: { workspaceId }, orderBy: { score: "desc" } });
}

export async function listImagePrompts(workspaceId: string) {
  return prisma.imagePrompt.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createImagePrompt(input: {
  workspaceId: string;
  brandId: string;
  platform: string;
  topic: string;
  style: string;
  aspectRatio: string;
}) {
  const { prompt, negativePrompt } = buildPrompt(input.topic, input.platform, input.style);
  return prisma.imagePrompt.create({
    data: {
      ...input,
      prompt,
      negativePrompt,
      status: "completed",
      imageUrl: `https://images.unsplash.com/photo-${150000000 + Math.floor(Math.random() * 1000)}?w=800&h=800&fit=crop`,
    },
  });
}

export async function deleteImagePrompt(promptId: string, workspaceId: string) {
  const prompt = await prisma.imagePrompt.findUnique({ where: { id: promptId } });
  if (!prompt || prompt.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Prompt not found.");
  await prisma.imagePrompt.delete({ where: { id: promptId } });
}

function buildPrompt(topic: string, platform: string, style: string) {
  const styles: Record<string, string> = {
    editorial: "Clean, polished aesthetic with soft lighting",
    minimal: "Simple, uncluttered composition",
    bold: "High contrast, vibrant colors",
    vintage: "Warm tones, film grain texture",
    futuristic: "Sleek lines, neon accents",
    artistic: "Painterly quality, creative compositions",
  };
  const selectedStyle = styles[style] ?? styles.editorial;
  return {
    prompt: `Create a ${style || "editorial"} style social media image for ${platform} about "${topic}". ${selectedStyle}. Professional composition with clear focal point.`,
    negativePrompt: "Text overlays, watermarks, low resolution, blurry, cluttered composition, poor lighting",
  };
}
