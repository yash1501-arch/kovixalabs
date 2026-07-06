import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { analyzeFaceSwap } from "./ai-client.js";

export async function listFaceSwapJobs(workspaceId: string) {
  return prisma.faceSwapJob.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createFaceSwapJob(workspaceId: string, input: {
  brandId: string; sourceImageUrl: string; targetImageUrl: string;
  parameters?: Record<string, unknown>;
}) {
  const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
  if (!brand || brand.workspaceId !== workspaceId) throw new ApiError(404, "brand_not_found", "Brand not found.");

  const brandContext = `${brand.name}: ${brand.description ?? ""}`;

  const job = await prisma.faceSwapJob.create({
    data: {
      workspaceId,
      brandId: input.brandId,
      sourceImageUrl: input.sourceImageUrl,
      targetImageUrl: input.targetImageUrl,
      parameters: input.parameters as any,
      status: "PROCESSING",
    },
  });

  try {
    const analysis = await analyzeFaceSwap({
      sourceImageUrl: input.sourceImageUrl,
      targetImageUrl: input.targetImageUrl,
      brandContext,
    });

    await prisma.faceSwapJob.update({
      where: { id: job.id },
      data: {
        parameters: { ...(input.parameters ?? {}), aiAnalysis: analysis } as any,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return prisma.faceSwapJob.findUnique({ where: { id: job.id } })!;
  } catch {
    await prisma.faceSwapJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: "AI analysis failed" },
    });
    return prisma.faceSwapJob.findUnique({ where: { id: job.id } })!;
  }
}

export async function loadFaceSwapJob(jobId: string, workspaceId: string) {
  const job = await prisma.faceSwapJob.findUnique({ where: { id: jobId } });
  if (!job || job.workspaceId !== workspaceId) throw new ApiError(404, "job_not_found", "Face swap job not found.");
  return job;
}

export async function updateFaceSwapJob(jobId: string, workspaceId: string, data: {
  resultUrl?: string; status?: string; error?: string;
}) {
  await loadFaceSwapJob(jobId, workspaceId);
  const updateData: Record<string, unknown> = {};
  if (data.resultUrl !== undefined) updateData.resultUrl = data.resultUrl;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.error !== undefined) updateData.error = data.error;
  if (data.status === "COMPLETED" || data.status === "FAILED") updateData.completedAt = new Date();
  return prisma.faceSwapJob.update({ where: { id: jobId }, data: updateData as any });
}

export async function deleteFaceSwapJob(jobId: string, workspaceId: string) {
  await loadFaceSwapJob(jobId, workspaceId);
  await prisma.faceSwapJob.delete({ where: { id: jobId } });
}
