import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { generateCopy } from "./ai-client.js";

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

  const topics = config.topicPreferences.length > 0 ? config.topicPreferences : ["general brand content"];
  const times = config.preferredTimes.length > 0 ? config.preferredTimes : ["09:00", "12:00", "17:00"];
  const perPlatformPerDay = Math.ceil(config.postsPerWeek / config.platforms.length / 7) || 1;

  let totalGenerated = 0;
  let totalScheduled = 0;
  const errors: string[] = [];

  const run = await prisma.autopilotRun.create({
    data: {
      workspaceId,
      brandId: config.brandId,
      configId: config.id,
      status: "running",
      postsGenerated: 0,
      postsScheduled: 0,
      platforms: config.platforms,
      summary: "",
    },
  });

  try {
    for (const platform of config.platforms) {
      for (let day = 0; day < 7; day++) {
        for (let slot = 0; slot < perPlatformPerDay; slot++) {
          const topic = topics[(day + slot) % topics.length]!;
          const timeSlot = times[(day + slot) % times.length]!;
          const [hours, minutes] = timeSlot.split(":").map(Number);

          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + day);
          scheduledDate.setHours(hours ?? 9, minutes ?? 0, 0, 0);

          try {
            const result = await generateCopy({
              brandId: config.brandId,
              platform,
              objective: config.contentStyle,
              topic,
              variants: 1,
            });

            const caption = result.variants[0]?.caption ?? `Auto-generated ${config.contentStyle} post about ${topic}`;

            await prisma.post.create({
              data: {
                workspaceId,
                brandId: config.brandId,
                platform,
                status: "SCHEDULED",
                caption,
                hashtags: [],
                mediaUrls: [],
                scheduledAt: scheduledDate,
              },
            });

            totalGenerated++;
            totalScheduled++;
          } catch (e) {
            errors.push(`${platform} day ${day}: ${e instanceof Error ? e.message : "generation failed"}`);
          }
        }
      }
    }

    const summary = `Generated ${totalGenerated} posts across ${config.platforms.length} platforms.${errors.length > 0 ? ` ${errors.length} errors: ${errors.slice(0, 3).join("; ")}` : ""}`;

    await prisma.autopilotRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        postsGenerated: totalGenerated,
        postsScheduled: totalScheduled,
        summary,
      },
    });

    await prisma.autopilotConfig.update({
      where: { id: configId },
      data: { lastRanAt: new Date() },
    });
  } catch (e) {
    await prisma.autopilotRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        summary: e instanceof Error ? e.message : "Unknown error during autopilot run",
      },
    });
  }

  return prisma.autopilotRun.findUnique({ where: { id: run.id } })!;
}

export async function listRuns(configId: string, workspaceId: string) {
  return prisma.autopilotRun.findMany({
    where: { configId, workspaceId },
    orderBy: { createdAt: "desc" },
  });
}
