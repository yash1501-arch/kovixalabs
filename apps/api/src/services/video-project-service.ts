import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { generateVideoScript } from "./ai-client.js";

export async function listVideoProjects(workspaceId: string) {
  return prisma.videoProject.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createVideoProject(workspaceId: string, input: {
  brandId: string; title: string; description?: string;
  script?: string; scenes?: unknown[]; style?: string;
  duration?: number; resolution?: string; platform?: string;
  hashtags?: string[];
}) {
  const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
  if (!brand || brand.workspaceId !== workspaceId) throw new ApiError(404, "brand_not_found", "Brand not found.");

  return prisma.videoProject.create({
    data: {
      workspaceId,
      brandId: input.brandId,
      title: input.title,
      description: input.description ?? null,
      script: input.script ?? null,
      scenes: input.scenes as any ?? null,
      style: input.style ?? null,
      duration: input.duration ?? null,
      resolution: input.resolution ?? null,
      platform: input.platform ?? null,
      hashtags: input.hashtags ?? [],
    },
  });
}

export async function loadVideoProject(projectId: string, workspaceId: string) {
  const project = await prisma.videoProject.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== workspaceId) throw new ApiError(404, "project_not_found", "Video project not found.");
  return project;
}

export async function updateVideoProject(projectId: string, workspaceId: string, data: {
  renderedUrl?: string; thumbnailUrl?: string; voiceoverUrl?: string;
  musicTrack?: string; status?: string; script?: string;
}) {
  await loadVideoProject(projectId, workspaceId);
  const updateData: Record<string, unknown> = {};
  if (data.renderedUrl !== undefined) updateData.renderedUrl = data.renderedUrl;
  if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
  if (data.voiceoverUrl !== undefined) updateData.voiceoverUrl = data.voiceoverUrl;
  if (data.musicTrack !== undefined) updateData.musicTrack = data.musicTrack;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.script !== undefined) updateData.script = data.script;
  updateData.updatedAt = new Date();
  return prisma.videoProject.update({ where: { id: projectId }, data: updateData as any });
}

export async function deleteVideoProject(projectId: string, workspaceId: string) {
  await loadVideoProject(projectId, workspaceId);
  await prisma.videoProject.delete({ where: { id: projectId } });
}

export async function generateProjectScript(projectId: string, workspaceId: string) {
  const project = await loadVideoProject(projectId, workspaceId);

  const result = await generateVideoScript({
    brand_id: project.brandId,
    platform: project.platform ?? "instagram",
    topic: project.title,
    style: project.style ?? undefined,
    duration_seconds: project.duration ?? 30,
    cta: undefined,
  });

  await prisma.videoProject.update({
    where: { id: projectId },
    data: {
      script: JSON.stringify(result.scenes),
      scenes: result.scenes as any,
      hashtags: result.hashtags,
      status: "COMPLETED",
    },
  });

  return result;
}
