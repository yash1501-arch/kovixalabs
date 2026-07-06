import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { analyzeNews, scrapeNews } from "./ai-client.js";

export async function listNewsSources(workspaceId: string) {
  return prisma.newsSource.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createNewsSource(workspaceId: string, input: {
  brandId: string; name: string; url: string; category?: string;
}) {
  const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
  if (!brand || brand.workspaceId !== workspaceId) throw new ApiError(404, "brand_not_found", "Brand not found.");
  return prisma.newsSource.create({
    data: { workspaceId, brandId: input.brandId, name: input.name, url: input.url, category: input.category ?? null },
  });
}

export async function deleteNewsSource(sourceId: string, workspaceId: string) {
  const source = await prisma.newsSource.findUnique({ where: { id: sourceId } });
  if (!source || source.workspaceId !== workspaceId) throw new ApiError(404, "source_not_found", "News source not found.");
  await prisma.newsSource.delete({ where: { id: sourceId } });
}

export async function listNewsArticles(workspaceId: string, sourceId?: string) {
  return prisma.newsArticle.findMany({
    where: { workspaceId, ...(sourceId ? { sourceId } : {}) },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });
}

export async function scrapeNewsSource(sourceId: string, workspaceId: string) {
  const source = await prisma.newsSource.findUnique({ where: { id: sourceId } });
  if (!source || source.workspaceId !== workspaceId) throw new ApiError(404, "source_not_found", "News source not found.");

  const result = await scrapeNews(source.url, 20);

  const articles = [];
  for (const article of result.articles) {
    const existing = await prisma.newsArticle.findFirst({
      where: { workspaceId, sourceId, url: article.url },
    });
    if (existing) continue;

    const created = await prisma.newsArticle.create({
      data: {
        workspaceId,
        sourceId,
        brandId: source.brandId,
        title: article.title,
        url: article.url,
        content: article.content ?? null,
        summary: article.summary ?? null,
        author: article.author ?? null,
        publishedAt: article.published_at ? new Date(article.published_at) : null,
        imageUrl: article.image_url ?? null,
      },
    });
    articles.push(created);
  }

  await prisma.newsSource.update({
    where: { id: sourceId },
    data: { lastScrapedAt: new Date() },
  });

  return { newArticles: articles.length, total: result.articles.length };
}

export async function analyzeArticles(workspaceId: string, sourceId?: string) {
  const articles = await prisma.newsArticle.findMany({
    where: { workspaceId, relevanceScore: null, ...(sourceId ? { sourceId } : {}) },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  const brand = await prisma.brand.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
  const brandContext = brand ? `${brand.name}: ${brand.description ?? ""}` : "";

  const result = await analyzeNews({
    articles: articles.map((a) => ({
      url: a.url,
      title: a.title,
      content: a.content ?? undefined,
      summary: a.summary ?? undefined,
    })),
    brand_context: brandContext,
  });

  let updated = 0;
  for (const analysis of result.analyses) {
    const article = articles.find((a) => a.url === analysis.url);
    if (!article) continue;
    await prisma.newsArticle.update({
      where: { id: article.id },
      data: {
        summary: analysis.summary,
        keywords: analysis.keywords,
        relevanceScore: analysis.relevance_score,
        sentiment: analysis.sentiment,
      },
    });
    updated++;
  }

  return { analyzed: updated, total: articles.length };
}
