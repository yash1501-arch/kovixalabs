import type { Prisma } from "@prisma/client";
import { ContentPlanItemRecordSchema, ContentPlanRecordSchema } from "@kovixalabs/shared";
import type { SocialPlatform } from "@kovixalabs/shared";
import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { toPrismaJson } from "./helpers.js";
import { loadBrand, searchMemoryEntries } from "./brand-service.js";
import { generateCopy } from "./ai-client.js";

type PrismaContentPlanRecord = Prisma.ContentPlanGetPayload<Record<string, never>>;
type PrismaContentPlanItemRecord = Prisma.ContentPlanItemGetPayload<Record<string, never>>;

export function serializeContentPlan(plan: PrismaContentPlanRecord) {
  return ContentPlanRecordSchema.parse({
    id: plan.id, workspaceId: plan.workspaceId, brandId: plan.brandId, name: plan.name,
    platform: plan.platform, startDate: plan.startDate, endDate: plan.endDate,
    postCount: plan.postCount, themes: plan.themes, status: plan.status.toLowerCase(),
    createdAt: plan.createdAt.toISOString(), updatedAt: plan.updatedAt.toISOString(),
  });
}

export function serializeContentPlanItem(item: PrismaContentPlanItemRecord) {
  return ContentPlanItemRecordSchema.parse({
    id: item.id, planId: item.planId, day: item.day, platform: item.platform,
    topic: item.topic, caption: item.caption, hashtags: item.hashtags,
    scheduledDate: item.scheduledDate, status: item.status.toLowerCase(),
  });
}

export async function listContentPlans(workspaceId: string) {
  const plans = await prisma.contentPlan.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
  return plans.map(serializeContentPlan);
}

export async function createContentPlan(workspaceId: string, input: any) {
  const brand = await loadBrand(input.brandId);
  if (brand.workspaceId !== workspaceId) throw new ApiError(400, "brand_workspace_mismatch", "Brand does not belong to this workspace.");
  const result = await prisma.$transaction(async (tx) => {
    const plan = await tx.contentPlan.create({
      data: { workspaceId, brandId: input.brandId, name: input.name, platform: input.platform, startDate: input.startDate, endDate: input.endDate, postCount: input.postCount, themes: input.themes ?? [], status: "DRAFT" },
    });
    const serialized = serializeContentPlan(plan);

    let memoryContext: string[] = [];
    try {
      const memoryResults = await searchMemoryEntries(input.brandId, { query: `content ideas ${input.platform} ${(input.themes ?? []).join(" ")}`, limit: 5 });
      memoryContext = memoryResults.map((m: any) => m.content);
    } catch {
      // Memory not available, use defaults
    }

    const items = await generatePlanItems(serialized, memoryContext);
    await tx.contentPlanItem.createMany({ data: items.map((item) => ({ id: item.id, planId: item.planId, day: item.day, platform: item.platform, topic: item.topic, caption: item.caption, hashtags: item.hashtags, scheduledDate: item.scheduledDate, status: "IDEA" })) });
    const savedItems = await tx.contentPlanItem.findMany({ where: { planId: plan.id }, orderBy: { day: "asc" } });
    return { plan: serialized, items: savedItems.map(serializeContentPlanItem) };
  });
  return result;
}

export async function listContentPlanItems(workspaceId: string, planId: string) {
  const plan = await prisma.contentPlan.findFirst({ where: { id: planId, workspaceId }, select: { id: true } });
  if (!plan) throw new ApiError(404, "not_found", "Plan not found.");
  const items = await prisma.contentPlanItem.findMany({ where: { planId }, orderBy: { day: "asc" } });
  return items.map(serializeContentPlanItem);
}

export async function updateContentPlanItemStatus(workspaceId: string, planId: string, itemId: string, status: string) {
  const plan = await prisma.contentPlan.findFirst({ where: { id: planId, workspaceId }, select: { id: true } });
  if (!plan) throw new ApiError(404, "not_found", "Plan not found.");
  const item = await prisma.contentPlanItem.findFirst({ where: { id: itemId, planId } });
  if (!item) throw new ApiError(404, "not_found", "Item not found.");
  const updated = await prisma.contentPlanItem.update({ where: { id: itemId }, data: { status: status.toUpperCase() as any } });
  return serializeContentPlanItem(updated);
}

export async function deleteContentPlan(workspaceId: string, planId: string): Promise<void> {
  const plan = await prisma.contentPlan.findFirst({ where: { id: planId, workspaceId }, select: { id: true } });
  if (!plan) throw new ApiError(404, "not_found", "Plan not found.");
  await prisma.contentPlan.delete({ where: { id: planId } });
}

export async function generatePlanItems(plan: any, memoryContext: string[] = []) {
  const start = new Date(plan.startDate);
  const brandContext = memoryContext.length > 0 ? memoryContext.slice(0, 3).join("\n") : "";

  const items = [];
  for (let i = 0; i < plan.postCount; i++) {
    const dayOffset = Math.floor((i / Math.max(plan.postCount, 1)) * 30);
    const scheduledDate = new Date(start.getTime() + dayOffset * 86400000);
    const dateStr = scheduledDate.toISOString().split("T")[0] ?? scheduledDate.toISOString();

    try {
      const theme = plan.themes[i % Math.max(plan.themes.length, 1)] ?? "general brand content";
      const result = await generateCopy({
        brandId: plan.brandId,
        platform: plan.platform,
        objective: "engagement",
        topic: theme,
        variants: 1,
      });

      const variant = result.variants[0];
      items.push(ContentPlanItemRecordSchema.parse({
        id: crypto.randomUUID(), planId: plan.id, day: i + 1, platform: plan.platform,
        topic: theme,
        caption: variant?.caption ?? `${theme} - Sharing insights for our community.`,
        hashtags: [`#${plan.platform}`, `#${theme.toLowerCase().replace(/\s/g, "")}`],
        scheduledDate: dateStr,
        status: "idea",
      }));
    } catch {
      const topics = ["Industry insight", "Tips & tricks", "Behind the scenes", "Customer story", "Thought leadership"];
      const fallbackTopic = topics[i % topics.length] ?? "Content post";
      items.push(ContentPlanItemRecordSchema.parse({
        id: crypto.randomUUID(), planId: plan.id, day: i + 1, platform: plan.platform,
        topic: fallbackTopic,
        caption: brandContext
          ? `${fallbackTopic}. ${brandContext.slice(0, 200)}`
          : `${fallbackTopic}. Sharing insights that matter to our community.`,
        hashtags: [`#${plan.platform}`, "#content"],
        scheduledDate: dateStr,
        status: "idea",
      }));
    }
  }

  return items;
}
