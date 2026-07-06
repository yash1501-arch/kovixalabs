import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { ingestMemory } from "./ai-client.js";

export async function listDocuments(workspaceId: string, brandId: string) {
  return prisma.brandMemoryDocument.findMany({
    where: { workspaceId, brandId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDocument(input: {
  workspaceId: string;
  brandId: string;
  title: string;
  content: string;
  sourceType?: string;
  mimeType?: string;
  fileSize?: number;
  tags?: string[];
}) {
  const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
  if (!brand || brand.workspaceId !== input.workspaceId) {
    throw new ApiError(404, "brand_not_found", "Brand not found.");
  }

  const document = await prisma.brandMemoryDocument.create({
    data: {
      workspaceId: input.workspaceId,
      brandId: input.brandId,
      title: input.title,
      content: input.content,
      sourceType: input.sourceType ?? "manual",
      mimeType: input.mimeType ?? null,
      fileSize: input.fileSize ?? null,
      tags: input.tags ?? [],
    },
  });

  await embedDocument(document);

  return document;
}

export async function deleteDocument(documentId: string, workspaceId: string) {
  const doc = await prisma.brandMemoryDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.workspaceId !== workspaceId) {
    throw new ApiError(404, "document_not_found", "Document not found.");
  }
  await prisma.brandMemoryDocument.delete({ where: { id: documentId } });
}

export async function embedDocument(document: {
  id: string;
  workspaceId: string;
  brandId: string;
  title: string;
  content: string;
  tags: string[];
}) {
  try {
    await ingestMemory({
      entry_id: `doc-${document.id}`,
      workspace_id: document.workspaceId,
      brand_id: document.brandId,
      title: document.title,
      content: document.content,
      tags: [...document.tags, "document"],
      source: "document_ingestion",
    });

    await prisma.brandMemoryDocument.update({
      where: { id: document.id },
      data: { embedded: true, chunkCount: Math.ceil(document.content.length / 1000) },
    });
  } catch {
    await prisma.brandMemoryDocument.update({
      where: { id: document.id },
      data: { embedded: false },
    });
  }
}

export async function reembedAllDocuments(workspaceId: string, brandId: string) {
  const docs = await prisma.brandMemoryDocument.findMany({
    where: { workspaceId, brandId },
  });
  for (const doc of docs) {
    await embedDocument(doc);
  }
  return { reembedded: docs.length };
}

export async function getDocumentStats(workspaceId: string, brandId: string) {
  const [total, embedded, totalSize] = await Promise.all([
    prisma.brandMemoryDocument.count({ where: { workspaceId, brandId } }),
    prisma.brandMemoryDocument.count({ where: { workspaceId, brandId, embedded: true } }),
    prisma.brandMemoryDocument.aggregate({
      where: { workspaceId, brandId },
      _sum: { fileSize: true },
    }),
  ]);
  return {
    totalDocuments: total,
    embeddedDocuments: embedded,
    pendingEmbedding: total - embedded,
    totalSizeBytes: totalSize._sum.fileSize ?? 0,
  };
}
