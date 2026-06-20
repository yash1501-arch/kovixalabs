import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";

export async function listMlopsModels(workspaceId: string) {
  await prisma.workspace.upsert({
    where: { id: workspaceId },
    update: {},
    create: { id: workspaceId, name: workspaceId, slug: workspaceId },
  });
  const existing = await prisma.mlopsModel.findFirst({ where: { workspaceId } });
  if (!existing) {
    const now = new Date();
    const seeds = [
      { name: "Content Generator v4", version: "4.2.1", stage: "production", baseModel: "gpt-4o", accuracy: 94.2, inferenceLatencyMs: 320, requestsPerDay: 15000, errorRate: 0.02 },
      { name: "Hashtag Optimizer v2", version: "2.0.0", stage: "staging", baseModel: "aismos-hashtag-v1", accuracy: 87.5, inferenceLatencyMs: 180, requestsPerDay: 5000, errorRate: 0.05 },
      { name: "Tone Analyzer v3", version: "3.1.0", stage: "development", baseModel: "aismos-tone-v3", accuracy: 82.3, inferenceLatencyMs: 250, requestsPerDay: 2000, errorRate: 0.08 },
      { name: "Image Describer v1", version: "1.0.2", stage: "production", baseModel: "claude-3", accuracy: 91.8, inferenceLatencyMs: 450, requestsPerDay: 8000, errorRate: 0.01 },
    ];
    await prisma.mlopsModel.createMany({
      data: seeds.map((s) => ({
        workspaceId,
        ...s,
        brandId: null,
        lastDeployedAt: s.stage === "production" ? now : null,
        createdAt: now,
      })),
    });
  }
  return prisma.mlopsModel.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function promoteMlopsModel(modelId: string, workspaceId: string, stage: string) {
  const model = await prisma.mlopsModel.findUnique({ where: { id: modelId } });
  if (!model || model.workspaceId !== workspaceId) throw new ApiError(404, "not_found", "Model not found.");
  return prisma.mlopsModel.update({
    where: { id: modelId },
    data: {
      stage,
      lastDeployedAt: stage === "production" ? new Date() : model.lastDeployedAt,
    },
  });
}

export async function listExperiments(workspaceId: string) {
  await prisma.workspace.upsert({
    where: { id: workspaceId },
    update: {},
    create: { id: workspaceId, name: workspaceId, slug: workspaceId },
  });
  const existing = await prisma.experiment.findFirst({ where: { workspaceId } });
  if (!existing) {
    const now = new Date();
    const seeds = [
      { name: "Caption Style A/B", description: "Comparing professional vs casual caption tones", status: "running", modelCount: 2, bestAccuracy: 87.3, bestLatencyMs: 210 },
      { name: "Hashtag Volume Test", description: "Testing optimal number of hashtags per post", status: "completed", modelCount: 3, bestAccuracy: 92.1, bestLatencyMs: 180 },
      { name: "Tone Adaptation v3", description: "Fine-tuning tone for B2B vs B2C audiences", status: "completed", modelCount: 4, bestAccuracy: 89.5, bestLatencyMs: null },
    ];
    await prisma.experiment.createMany({
      data: seeds.map((s) => ({
        workspaceId,
        metric: "accuracy",
        createdAt: now,
        updatedAt: now,
        ...s,
      })),
    });
  }
  return prisma.experiment.findMany({ where: { workspaceId } });
}

export async function createExperiment(input: {
  workspaceId: string;
  name: string;
  description: string;
  metric: string;
}) {
  return prisma.experiment.create({
    data: {
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      metric: input.metric,
      status: "running",
      modelCount: 0,
      bestAccuracy: null,
      bestLatencyMs: null,
    },
  });
}
