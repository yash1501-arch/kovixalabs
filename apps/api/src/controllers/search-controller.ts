import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { serializePost } from "../services/post-service.js";

const SearchSchema = z.object({
  q: z.string().min(1).max(100),
});

export async function search(request: Request, response: Response) {
  const workspaceId = request.params.workspaceId;
  const { q } = SearchSchema.parse(request.query);
  const term = `%${q}%`;

  const [posts, brands, campaigns, articles] = await Promise.all([
    prisma.post.findMany({
      where: { workspaceId, caption: { contains: q, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.brand.findMany({
      where: { workspaceId, OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.adCampaign.findMany({
      where: { workspaceId, OR: [{ objective: { contains: q, mode: "insensitive" } }, { targetAudience: { contains: q, mode: "insensitive" } }] },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.newsArticle.findMany({
      where: { workspaceId, title: { contains: q, mode: "insensitive" } },
      orderBy: { publishedAt: "desc" },
      take: 5,
    }),
  ]);

  response.json({
    posts: posts.map(serializePost),
    brands: brands.map((b) => ({ id: b.id, name: b.name, description: b.description })),
    campaigns: campaigns.map((c) => ({ id: c.id, platform: c.platform, objective: c.objective, status: c.status })),
    articles: articles.map((a) => ({ id: a.id, title: a.title, url: a.url })),
  });
}
