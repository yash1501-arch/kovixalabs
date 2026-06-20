import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";

export async function listConfigs(workspaceId: string) {
  return prisma.autopilotConfig.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function upsertConfig(input: {
  workspaceId: string;
  brandId: string;
  platforms: string[];
  postsPerWeek: number;
  preferredTimes: string[];
  contentStyle: string;
  topicPreferences: string[];
}) {
  const existing = await prisma.autopilotConfig.findUnique({
    where: { workspaceId_brandId: { workspaceId: input.workspaceId, brandId: input.brandId } },
  });

  if (existing) {
    return prisma.autopilotConfig.update({
      where: { id: existing.id },
      data: {
        platforms: input.platforms,
        postsPerWeek: input.postsPerWeek,
        preferredTimes: input.preferredTimes,
        contentStyle: input.contentStyle,
        topicPreferences: input.topicPreferences,
      },
    });
  }

  return prisma.autopilotConfig.create({
    data: {
      workspaceId: input.workspaceId,
      brandId: input.brandId,
      enabled: true,
      platforms: input.platforms,
      postsPerWeek: input.postsPerWeek,
      preferredTimes: input.preferredTimes,
      contentStyle: input.contentStyle,
      topicPreferences: input.topicPreferences,
    },
  });
}

export async function updateConfig(configId: string, workspaceId: string, enabled: boolean) {
  const config = await prisma.autopilotConfig.findUnique({ where: { id: configId } });
  if (!config || config.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Autopilot config not found.");
  return prisma.autopilotConfig.update({ where: { id: configId }, data: { enabled } });
}

export async function runConfig(configId: string, workspaceId: string) {
  const config = await prisma.autopilotConfig.findUnique({ where: { id: configId } });
  if (!config || config.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Autopilot config not found.");
  if (!config.enabled) throw new ApiError(400, "autopilot_disabled", "Autopilot is disabled.");

  const generatedPosts = config.platforms.map((platform) => ({
    platform,
    caption: `Auto-generated ${config.contentStyle} post for ${config.brandId}`,
    status: "scheduled" as const,
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
  }));

  return prisma.autopilotRun.create({
    data: {
      workspaceId,
      brandId: config.brandId,
      configId: config.id,
      status: "completed",
      postsGenerated: generatedPosts.length,
      postsScheduled: generatedPosts.length,
      platforms: config.platforms,
      summary: `Generated ${generatedPosts.length} posts across ${config.platforms.length} platforms.`,
    },
  });
}

export async function listRuns(configId: string, workspaceId: string) {
  return prisma.autopilotRun.findMany({
    where: { configId, workspaceId },
    orderBy: { createdAt: "desc" },
  });
}
