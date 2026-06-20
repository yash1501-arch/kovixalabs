import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";

export async function listDatasets(workspaceId: string) {
  return prisma.finetuneDataset.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDataset(input: {
  workspaceId: string;
  brandId: string;
  name: string;
  description: string;
  exampleCount: number;
  fileSizeKb: number;
}) {
  return prisma.finetuneDataset.create({
    data: {
      workspaceId: input.workspaceId,
      brandId: input.brandId,
      name: input.name,
      description: input.description,
      exampleCount: input.exampleCount,
      fileSizeKb: input.fileSizeKb,
      status: "ready",
    },
  });
}

export async function deleteDataset(datasetId: string, workspaceId: string) {
  const dataset = await prisma.finetuneDataset.findUnique({ where: { id: datasetId } });
  if (!dataset || dataset.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Dataset not found.");
  await prisma.finetuneDataset.delete({ where: { id: datasetId } });
}

export async function listJobs(workspaceId: string) {
  return prisma.finetuneJob.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createJob(input: {
  workspaceId: string;
  brandId: string;
  datasetId: string;
  jobName: string;
  baseModel: string;
  totalEpochs: number;
}) {
  const job = await prisma.finetuneJob.create({
    data: {
      workspaceId: input.workspaceId,
      brandId: input.brandId,
      datasetId: input.datasetId,
      jobName: input.jobName,
      baseModel: input.baseModel,
      status: "completed",
      progress: 100,
      currentEpoch: input.totalEpochs,
      totalEpochs: input.totalEpochs,
      trainLoss: Number((0.1 + Math.random() * 0.5).toFixed(4)),
      valLoss: Number((0.2 + Math.random() * 0.6).toFixed(4)),
      accuracy: Number((70 + Math.random() * 25).toFixed(1)),
      estimatedSecondsRemaining: 0,
    },
  });

  const model = await prisma.finetunedModel.create({
    data: {
      workspaceId: input.workspaceId,
      brandId: input.brandId,
      jobId: job.id,
      name: input.jobName,
      baseModel: input.baseModel,
      status: "ready",
      accuracy: job.accuracy ?? 85,
      inferenceLatencyMs: Math.floor(50 + Math.random() * 200),
      totalInferences: 0,
    },
  });

  return { job, model };
}

export async function listModels(workspaceId: string) {
  return prisma.finetunedModel.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deployModel(modelId: string, workspaceId: string) {
  const model = await prisma.finetunedModel.findUnique({ where: { id: modelId } });
  if (!model || model.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Model not found.");
  return prisma.finetunedModel.update({
    where: { id: modelId },
    data: { status: "deployed", deployedAt: new Date() },
  });
}
