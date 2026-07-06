import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";

export async function listMediaAssets(workspaceId: string, brandId?: string) {
  const where: Record<string, unknown> = { workspaceId };
  if (brandId) where.brandId = brandId;
  return prisma.mediaAsset.findMany({ where, orderBy: { createdAt: "desc" } });
}

export async function createMediaAsset(workspaceId: string, input: {
  brandId: string; type: string; url?: string; thumbnailUrl?: string;
  fileName?: string; mimeType?: string; fileSize?: number;
  width?: number; height?: number; duration?: number;
  altText?: string; metadata?: Record<string, unknown>;
  prompt?: string; model?: string; tags?: string[];
}) {
  const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
  if (!brand || brand.workspaceId !== workspaceId) throw new ApiError(404, "brand_not_found", "Brand not found.");
  return prisma.mediaAsset.create({
    data: {
      workspaceId,
      brandId: input.brandId,
      type: input.type as any,
      url: input.url,
      thumbnailUrl: input.thumbnailUrl,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      width: input.width,
      height: input.height,
      duration: input.duration,
      altText: input.altText,
      metadata: input.metadata as any,
      prompt: input.prompt,
      model: input.model,
      tags: input.tags ?? [],
    },
  });
}

export async function loadMediaAsset(assetId: string, workspaceId: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.workspaceId !== workspaceId) throw new ApiError(404, "asset_not_found", "Media asset not found.");
  return asset;
}

export async function updateMediaAsset(assetId: string, workspaceId: string, data: Partial<{
  url: string; thumbnailUrl: string; status: string; altText: string;
  tags: string[]; metadata: Record<string, unknown>;
}>) {
  const asset = await loadMediaAsset(assetId, workspaceId);
  return prisma.mediaAsset.update({
    where: { id: assetId },
    data: {
      ...(data.url !== undefined && { url: data.url }),
      ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
      ...(data.status !== undefined && { status: data.status as any }),
      ...(data.altText !== undefined && { altText: data.altText }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.metadata !== undefined && { metadata: data.metadata as any }),
    },
  });
}

export async function deleteMediaAsset(assetId: string, workspaceId: string) {
  const asset = await loadMediaAsset(assetId, workspaceId);
  await prisma.mediaAsset.delete({ where: { id: assetId } });
}
