import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";

export async function listVideoFaceSwapJobs(workspaceId: string) {
  return prisma.videoFaceSwapJob.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createVideoFaceSwapJob(workspaceId: string, input: {
  brandId: string; sourceFaceUrl: string; targetVideoUrl: string;
  parameters?: Record<string, unknown>;
}) {
  const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
  if (!brand || brand.workspaceId !== workspaceId) throw new ApiError(404, "brand_not_found", "Brand not found.");
  return prisma.videoFaceSwapJob.create({
    data: {
      workspaceId,
      brandId: input.brandId,
      sourceFaceUrl: input.sourceFaceUrl,
      targetVideoUrl: input.targetVideoUrl,
      parameters: input.parameters as any,
    },
  });
}

export async function loadVideoFaceSwapJob(jobId: string, workspaceId: string) {
  const job = await prisma.videoFaceSwapJob.findUnique({ where: { id: jobId } });
  if (!job || job.workspaceId !== workspaceId) throw new ApiError(404, "job_not_found", "Video face swap job not found.");
  return job;
}

export async function updateVideoFaceSwapJob(jobId: string, workspaceId: string, data: {
  resultUrl?: string; status?: string; error?: string;
}) {
  await loadVideoFaceSwapJob(jobId, workspaceId);
  const updateData: Record<string, unknown> = {};
  if (data.resultUrl !== undefined) updateData.resultUrl = data.resultUrl;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.error !== undefined) updateData.error = data.error;
  if (data.status === "COMPLETED" || data.status === "FAILED") updateData.completedAt = new Date();
  return prisma.videoFaceSwapJob.update({ where: { id: jobId }, data: updateData as any });
}

export async function deleteVideoFaceSwapJob(jobId: string, workspaceId: string) {
  await loadVideoFaceSwapJob(jobId, workspaceId);
  await prisma.videoFaceSwapJob.delete({ where: { id: jobId } });
}
