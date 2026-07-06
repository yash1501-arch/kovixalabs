import type { PostTemplateCreate } from "@kovixalabs/shared";
import { PostTemplateSchema } from "@kovixalabs/shared";
import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";

const db = prisma as any;

function serialize(model: any) {
  return PostTemplateSchema.parse({
    id: model.id,
    workspaceId: model.workspaceId,
    brandId: model.brandId,
    platform: model.platform,
    name: model.name,
    caption: model.caption ?? "",
    hashtags: model.hashtags,
    mediaUrls: model.mediaUrls,
    createdAt: model.createdAt instanceof Date ? model.createdAt.toISOString() : model.createdAt,
    updatedAt: model.updatedAt instanceof Date ? model.updatedAt.toISOString() : model.updatedAt,
  });
}

export async function listTemplates(workspaceId: string, platform?: string) {
  const where: any = { workspaceId };
  if (platform) where.platform = platform;
  const templates = await db.postTemplate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
  return templates.map(serialize);
}

export async function getTemplate(workspaceId: string, templateId: string) {
  const t = await db.postTemplate.findFirst({ where: { id: templateId, workspaceId } });
  if (!t) throw new ApiError(404, "not_found", "Template not found.");
  return serialize(t);
}

export async function createTemplate(workspaceId: string, input: PostTemplateCreate) {
  const t = await db.postTemplate.create({
    data: {
      workspaceId,
      brandId: input.brandId || null,
      platform: input.platform,
      name: input.name,
      caption: input.caption,
      hashtags: input.hashtags,
      mediaUrls: input.mediaUrls,
    },
  });
  return serialize(t);
}

export async function updateTemplate(workspaceId: string, templateId: string, input: Partial<PostTemplateCreate>) {
  const existing = await db.postTemplate.findFirst({ where: { id: templateId, workspaceId } });
  if (!existing) throw new ApiError(404, "not_found", "Template not found.");
  const data: any = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.platform !== undefined) data.platform = input.platform;
  if (input.caption !== undefined) data.caption = input.caption;
  if (input.hashtags !== undefined) data.hashtags = input.hashtags;
  if (input.mediaUrls !== undefined) data.mediaUrls = input.mediaUrls;
  if (input.brandId !== undefined) data.brandId = input.brandId || null;
  const updated = await db.postTemplate.update({ where: { id: templateId }, data });
  return serialize(updated);
}

export async function deleteTemplate(workspaceId: string, templateId: string) {
  const existing = await db.postTemplate.findFirst({ where: { id: templateId, workspaceId } });
  if (!existing) throw new ApiError(404, "not_found", "Template not found.");
  await db.postTemplate.delete({ where: { id: templateId } });
}
