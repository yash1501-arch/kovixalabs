import type { Prisma } from "@prisma/client";
import { ContentPlanItemRecordSchema, ContentPlanRecordSchema } from "@kovixalabs/shared";
import type { SocialPlatform } from "@kovixalabs/shared";
import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { toPrismaJson } from "./helpers.js";
import { loadBrand, searchMemoryEntries } from "./brand-service.js";

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

    const items = generatePlanItems(serialized, memoryContext);
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

const contentIdeas: Record<string, string[]> = {
  instagram: ["Behind the scenes", "Product showcase", "Customer story", "Team spotlight", "Tips & tricks", "Trending audio reel", "Before & after", "Day in the life", "Q&A", "Milestone celebration"],
  linkedin: ["Industry insight", "Thought leadership", "Company milestone", "Hiring announcement", "Case study", "Market trend analysis", "Team achievement", "Product feature deep-dive", "Expert opinion", "How-to guide"],
  x: ["Hot take", "Thread: lessons learned", "Industry news reaction", "Quick tip", "Poll", "Behind the scenes", "Community shoutout", "Product update", "Interesting stat", "Question to followers"],
  facebook: ["Community question", "Customer story", "Product demo", "Event announcement", "Educational post", "User-generated content", "Company news", "Tips & tricks", "Milestone", "Team intro"],
  tiktok: ["Trending challenge", "Day in the life", "Product demo", "Educational", "POV story", "Behind the scenes", "Team culture", "Client transformation", "Myth busting", "Quick tips"],
  youtube: ["Tutorial", "Case study", "Product review", "Industry interview", "Day in the life", "Company culture", "How-to guide", "Q&A", "Behind the scenes", "Deep-dive analysis"],
};

export function generatePlanItems(plan: any, memoryContext: string[] = []) {
  const ideas = contentIdeas[plan.platform] ?? contentIdeas["instagram"] ?? [];
  const start = new Date(plan.startDate);
  return Array.from({ length: plan.postCount }, (_, i) => {
    const dayOffset = Math.floor((i / plan.postCount) * 30);
    const scheduledDate = new Date(start.getTime() + dayOffset * 86400000);
    const idea = ideas[i % ideas.length] ?? "Content post";
    const theme = plan.themes[i % Math.max(plan.themes.length, 1)] ?? "general";
    const memorySnippet = memoryContext.length > 0
      ? memoryContext[i % memoryContext.length]
      : "";

    return ContentPlanItemRecordSchema.parse({
      id: crypto.randomUUID(), planId: plan.id, day: i + 1, platform: plan.platform, topic: idea,
      caption: memorySnippet
        ? `${idea} - ${theme}. ${memorySnippet.slice(0, 200)}`
        : `${idea} - ${theme}. Sharing insights that matter to our community. Follow for more.`,
      hashtags: [`#${plan.platform}`, `#${theme.toLowerCase().replace(/\s/g, "")}`, "#content", "#marketing"],
      scheduledDate: scheduledDate.toISOString().split("T")[0] ?? scheduledDate.toISOString(),
      status: "idea",
    });
  });
}
