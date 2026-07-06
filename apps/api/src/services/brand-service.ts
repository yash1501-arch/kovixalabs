import type { Prisma } from "@prisma/client";
import { BrandMemoryEntryRecordSchema, BrandRecordSchema } from "@kovixalabs/shared";
import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { deleteMemory, ingestDocument as aiIngestDocument, ingestMemory, searchBrandMemory, summarizeDocument as aiSummarizeDocument } from "./ai-client.js";

type BrandWithProfile = Prisma.BrandGetPayload<{ include: { profile: true } }>;
type PrismaBrandMemoryEntryRecord = Prisma.BrandMemoryEntryGetPayload<Record<string, never>>;

export function serializeBrand(brand: BrandWithProfile) {
  return BrandRecordSchema.parse({
    id: brand.id,
    workspaceId: brand.workspaceId,
    name: brand.name,
    description: brand.description,
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString(),
    profile: brand.profile
      ? {
          id: brand.profile.id,
          brandId: brand.profile.brandId,
          targetAudience: brand.profile.targetAudience,
          toneOfVoice: brand.profile.toneOfVoice,
          contentPillars: brand.profile.contentPillars,
          competitors: brand.profile.competitors,
          restrictedTopics: brand.profile.restrictedTopics,
          approvedClaims: brand.profile.approvedClaims,
          visualStyleNotes: brand.profile.visualStyleNotes ?? undefined,
          createdAt: brand.profile.createdAt.toISOString(),
          updatedAt: brand.profile.updatedAt.toISOString(),
        }
      : null,
  });
}

function serializeMemoryEntry(entry: PrismaBrandMemoryEntryRecord) {
  return BrandMemoryEntryRecordSchema.parse({
    id: entry.id,
    workspaceId: entry.workspaceId,
    brandId: entry.brandId,
    title: entry.title,
    content: entry.content,
    tags: entry.tags,
    source: entry.source,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    score: entry.score ?? undefined,
  });
}

export async function listBrands(workspaceId: string) {
  const brands = await prisma.brand.findMany({
    where: { workspaceId },
    include: { profile: true },
    orderBy: { updatedAt: "desc" },
  });
  return brands.map(serializeBrand);
}

export async function createBrand(workspaceId: string, input: any) {
  await prisma.workspace.upsert({
    where: { id: workspaceId },
    update: {},
    create: { id: workspaceId, name: workspaceId, slug: workspaceId },
  });
  const brand = await prisma.brand.create({
    data: {
      workspaceId,
      name: input.name,
      description: input.description,
      profile: {
        create: {
          targetAudience: input.targetAudience,
          toneOfVoice: input.toneOfVoice,
          contentPillars: input.contentPillars ?? [],
          competitors: input.competitors ?? [],
          restrictedTopics: input.restrictedTopics ?? [],
          approvedClaims: input.approvedClaims ?? [],
          visualStyleNotes: input.visualStyleNotes,
        },
      },
    },
    include: { profile: true },
  });
  return serializeBrand(brand);
}

export async function loadBrand(brandId: string) {
  const brand = await prisma.brand.findUnique({ where: { id: brandId }, include: { profile: true } });
  if (!brand) throw new ApiError(404, "brand_not_found", "Brand was not found.");
  return serializeBrand(brand);
}

export async function updateBrand(brandId: string, input: any) {
  const brand = await prisma.brand.update({
    where: { id: brandId },
    data: {
      name: input.name,
      description: input.description,
      profile: {
        upsert: {
          create: {
            targetAudience: input.targetAudience,
            toneOfVoice: input.toneOfVoice,
            contentPillars: input.contentPillars ?? [],
            competitors: input.competitors ?? [],
            restrictedTopics: input.restrictedTopics ?? [],
            approvedClaims: input.approvedClaims ?? [],
            visualStyleNotes: input.visualStyleNotes,
          },
          update: {
            targetAudience: input.targetAudience,
            toneOfVoice: input.toneOfVoice,
            contentPillars: input.contentPillars ?? [],
            competitors: input.competitors ?? [],
            restrictedTopics: input.restrictedTopics ?? [],
            approvedClaims: input.approvedClaims ?? [],
            visualStyleNotes: input.visualStyleNotes,
          },
        },
      },
    },
    include: { profile: true },
  });
  return serializeBrand(brand);
}

export async function listMemoryEntries(brandId: string) {
  await loadBrand(brandId);
  const entries = await prisma.brandMemoryEntry.findMany({
    where: { brandId },
    orderBy: { updatedAt: "desc" },
  });
  return entries.map(serializeMemoryEntry);
}

export async function createMemoryEntry(brandId: string, input: any) {
  const brand = await loadBrand(brandId);
  const entry = await prisma.brandMemoryEntry.create({
    data: {
      workspaceId: brand.workspaceId,
      brandId: brand.id,
      title: input.title,
      content: input.content,
      tags: input.tags ?? [],
      source: input.source ?? "manual",
    },
  });

  try {
    await ingestMemory({
      entry_id: entry.id,
      workspace_id: brand.workspaceId,
      brand_id: brand.id,
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
      source: entry.source,
    });
  } catch {
    // Non-critical: memory is saved in DB even if vector store fails
  }

  return serializeMemoryEntry(entry);
}

export async function deleteMemoryEntry(entryId: string, brandId: string) {
  const brand = await loadBrand(brandId);
  const entry = await prisma.brandMemoryEntry.findFirst({
    where: { id: entryId, brandId },
  });
  if (!entry) {
    throw new ApiError(404, "memory_entry_not_found", "Brand memory entry was not found.");
  }

  await prisma.brandMemoryEntry.delete({ where: { id: entryId } });

  try {
    await deleteMemory(entryId);
  } catch {
    // Non-critical: DB entry is deleted even if vector store removal fails
  }
}

export async function searchMemoryEntries(brandId: string, input: { query: string; limit: number }) {
  const brand = await loadBrand(brandId);

  try {
    const result = await searchBrandMemory({
      query: input.query,
      brand_id: brandId,
      limit: input.limit,
    });

    if (result.results.length > 0) {
      return result.results.map((item: any) =>
        BrandMemoryEntryRecordSchema.parse({
          id: item.id,
          workspaceId: brand.workspaceId,
          brandId: brand.id,
          title: item.title,
          content: item.content,
          tags: item.tags ?? [],
          source: "manual",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          score: item.score,
        })
      );
    }
  } catch {
    // Fall back to DB-only search if AI service is unavailable
  }

  const entries = await listMemoryEntries(brandId);
  return entries.slice(0, input.limit);
}

export async function ingestBrandDocument(
  brandId: string,
  input: { title: string; content: string; source?: string },
) {
  const brand = await loadBrand(brandId);
  const result = await aiIngestDocument({
    workspace_id: brand.workspaceId,
    brand_id: brand.id,
    title: input.title,
    content: input.content,
    source: input.source ?? "upload",
  });

  for (const chunk of result.chunks) {
    await prisma.brandMemoryEntry.create({
      data: {
        workspaceId: brand.workspaceId,
        brandId: brand.id,
        title: chunk.title,
        content: chunk.content,
        tags: chunk.tags,
        source: input.source ?? "upload",
      },
    });
  }

  return result;
}

export async function summarizeBrandDocument(
  brandId: string,
  input: { title: string; content: string },
) {
  const brand = await loadBrand(brandId);
  return aiSummarizeDocument({
    workspace_id: brand.workspaceId,
    brand_id: brand.id,
    title: input.title,
    content: input.content,
  });
}
