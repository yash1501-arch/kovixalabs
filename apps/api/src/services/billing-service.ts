import { prisma } from "../db.js";

export async function getOrCreateBilling(workspaceId: string) {
  await ensureWorkspaceBilling(workspaceId);
  const billing = await prisma.workspaceBilling.findUnique({ where: { workspaceId } });
  return billing;
}

export async function ensureWorkspaceBilling(workspaceId: string) {
  const existing = await prisma.workspaceBilling.findUnique({ where: { workspaceId } });
  if (existing) return;

  const teamMemberCount = await prisma.teamMember.count({ where: { workspaceId } });
  const postCount = await prisma.post.count({ where: { workspaceId } });
  const aiTaskCount = await prisma.aiTask.count({ where: { workspaceId } });
  const mediaAssetCount = await prisma.mediaAsset.count({ where: { workspaceId } });

  await prisma.workspaceBilling.create({
    data: {
      workspaceId,
      plan: "team",
      status: "active",
      seatsTotal: 10,
      seatsUsed: Math.max(teamMemberCount, 1),
      amount: 79900,
      currency: "usd",
      interval: "annual",
      nextBillingAt: new Date(Date.now() + 30 * 86400000),
      paymentMethod: "card",
      paymentLast4: "4242",
      paymentBrand: "visa",
      aiGenerationLimit: 1000,
      aiGenerationUsed: Math.min(aiTaskCount, 1000),
      apiCallLimit: 50000,
      apiCallUsed: Math.min(postCount * 10 + aiTaskCount * 5, 50000),
      storageLimitMb: 5000,
      storageUsedMb: Math.min(mediaAssetCount * 5, 5000),
    },
  });
}

export async function getWorkspaceUsage(workspaceId: string) {
  const billing = await getOrCreateBilling(workspaceId);
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 86400000);
  const postCount = await prisma.post.count({ where: { workspaceId } });
  const scheduledPosts = await prisma.post.count({ where: { workspaceId, status: "SCHEDULED" } });
  const publishedPosts = await prisma.post.count({ where: { workspaceId, status: "PUBLISHED" } });
  const aiTaskCount = await prisma.aiTask.count({ where: { workspaceId, createdAt: { gte: periodStart } } });
  const apiCalls = await prisma.auditLog.count({ where: { workspaceId, createdAt: { gte: periodStart } } });
  const mediaAssets = await prisma.mediaAsset.findMany({
    where: { workspaceId },
    select: { fileSize: true },
  });
  const storageUsed = mediaAssets.reduce((sum, a) => sum + (a.fileSize ?? 0), 0) / (1024 * 1024);

  return {
    workspaceId,
    period: {
      start: periodStart.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
    },
    posts: {
      scheduled: scheduledPosts,
      published: publishedPosts,
      total: postCount,
    },
    aiGenerations: {
      used: Math.min(aiTaskCount, billing?.aiGenerationLimit ?? 1000),
      limit: billing?.aiGenerationLimit ?? 1000,
    },
    apiCalls: {
      used: Math.min(apiCalls, billing?.apiCallLimit ?? 50000),
      limit: billing?.apiCallLimit ?? 50000,
    },
    storage: {
      used: Math.round(storageUsed * 100) / 100,
      limit: billing?.storageLimitMb ?? 5000,
    },
  };
}
