import { Router, type RequestHandler } from "express";
import { prisma } from "../db.js";
import { publishPost } from "../services/post-service.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const internalRouter = Router();

internalRouter.get("/scheduled-posts", asyncRoute(async (_request, response) => {
  const now = new Date();
  const posts = await prisma.post.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    select: {
      id: true,
      workspaceId: true,
      platform: true,
      caption: true,
      hashtags: true,
      mediaUrls: true,
      scheduledAt: true,
    },
    orderBy: { scheduledAt: "asc" },
  });
  response.json(posts);
}));

internalRouter.post("/publish", asyncRoute(async (request, response) => {
  const { postId, workspaceId } = request.body as { postId?: string; workspaceId?: string };

  if (!postId || !workspaceId) {
    response.status(400).json({ error: "missing_fields", message: "postId and workspaceId are required." });
    return;
  }

  await publishPost(workspaceId, postId);
  response.json({ status: "ok", postId });
}));
