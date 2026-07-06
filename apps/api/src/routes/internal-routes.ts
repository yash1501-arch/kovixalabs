import { Router, type RequestHandler, type Request, type Response, type NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config.js";
import { prisma } from "../db.js";
import { publishPost } from "../services/post-service.js";
import { getWorkspaceStats } from "../services/analytics-service.js";
import { refreshExpiringMetaTokens } from "../services/social-account-service.js";
import { refreshYouTubeTokens, refreshTikTokTokens, refreshTwitterTokens } from "../services/platform-token-refresh.js";

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function requireInternalAuth(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers["x-internal-token"] as string | undefined;
  const expected = env.internalAuthToken;

  if (!provided || provided.length !== expected.length) {
    res.status(401).json({ error: "unauthorized", message: "Valid internal token required." });
    return;
  }

  const bufProvided = Buffer.from(provided);
  const bufExpected = Buffer.from(expected);

  if (bufProvided.length !== bufExpected.length || !timingSafeEqual(bufProvided, bufExpected)) {
    res.status(401).json({ error: "unauthorized", message: "Valid internal token required." });
    return;
  }

  next();
}

export const internalRouter = Router();
internalRouter.use(requireInternalAuth);

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

internalRouter.get("/workspaces", asyncRoute(async (_request, response) => {
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true, slug: true },
  });
  response.json(workspaces);
}));

internalRouter.post("/analytics/sync", asyncRoute(async (request, response) => {
  const { workspaceId } = request.body as { workspaceId?: string };
  if (!workspaceId) {
    response.status(400).json({ error: "missing_fields", message: "workspaceId is required." });
    return;
  }
  const stats = await getWorkspaceStats(workspaceId, "30d");
  response.json({ status: "ok", workspaceId, stats });
}));

internalRouter.post("/tokens/refresh", asyncRoute(async (_request, response) => {
  const meta = await refreshExpiringMetaTokens();
  const youtube = await refreshYouTubeTokens();
  const tiktok = await refreshTikTokTokens();
  const twitter = await refreshTwitterTokens();
  response.json({ status: "ok", meta, youtube, tiktok, twitter });
}));
