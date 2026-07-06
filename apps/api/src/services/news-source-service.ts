import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";

export async function listNewsSources(workspaceId: string) {
  return prisma.newsSource.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createNewsSource(workspaceId: string, input: {
  brandId: string; name: string; url: string;
  type?: string; category?: string; scrapeInterval?: number;
}) {
  const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
  if (!brand || brand.workspaceId !== workspaceId) throw new ApiError(404, "brand_not_found", "Brand not found.");
  const existing = await prisma.newsSource.findUnique({
    where: { workspaceId_url: { workspaceId, url: input.url } },
  });
  if (existing) throw new ApiError(409, "source_exists", "News source already exists.");
  return prisma.newsSource.create({
    data: {
      workspaceId,
      brandId: input.brandId,
      name: input.name,
      url: input.url,
      type: input.type ?? "RSS",
      category: input.category,
      scrapeInterval: input.scrapeInterval,
    },
  });
}

export async function deleteNewsSource(sourceId: string, workspaceId: string) {
  const source = await prisma.newsSource.findUnique({ where: { id: sourceId } });
  if (!source || source.workspaceId !== workspaceId) throw new ApiError(404, "source_not_found", "News source not found.");
  await prisma.newsSource.delete({ where: { id: sourceId } });
}

export async function listNewsArticles(workspaceId: string, sourceId?: string) {
  const where: Record<string, unknown> = { workspaceId };
  if (sourceId) where.sourceId = sourceId;
  return prisma.newsArticle.findMany({
    where,
    orderBy: { publishedAt: "desc" },
  });
}

export async function createNewsArticle(workspaceId: string, input: {
  sourceId: string; title: string; url: string; content?: string;
  summary?: string; author?: string; publishedAt?: string;
  imageUrl?: string; category?: string; keywords?: string[];
}) {
  const source = await prisma.newsSource.findUnique({ where: { id: input.sourceId } });
  if (!source || source.workspaceId !== workspaceId) throw new ApiError(404, "source_not_found", "News source not found.");
  return prisma.newsArticle.create({
    data: {
      workspaceId,
      brandId: source.brandId,
      sourceId: input.sourceId,
      title: input.title,
      url: input.url,
      content: input.content,
      summary: input.summary,
      author: input.author,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      imageUrl: input.imageUrl,
      category: input.category,
      keywords: input.keywords ?? [],
    },
  });
}

export async function updateNewsArticle(articleId: string, workspaceId: string, data: {
  read?: boolean; saved?: boolean; relevanceScore?: number; sentiment?: string;
}) {
  const article = await prisma.newsArticle.findUnique({ where: { id: articleId } });
  if (!article || article.workspaceId !== workspaceId) throw new ApiError(404, "article_not_found", "News article not found.");
  return prisma.newsArticle.update({
    where: { id: articleId },
    data: {
      ...(data.read !== undefined && { read: data.read }),
      ...(data.saved !== undefined && { saved: data.saved }),
      ...(data.relevanceScore !== undefined && { relevanceScore: data.relevanceScore }),
      ...(data.sentiment !== undefined && { sentiment: data.sentiment }),
    },
  });
}
