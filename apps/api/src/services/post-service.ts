import type { Prisma } from "@prisma/client";
import { PostRecordSchema } from "@kovixalabs/shared";
import type { SocialPlatform } from "@kovixalabs/shared";
import { prisma } from "../db.js";
import { ApiError } from "../utils/api-error.js";
import { nowIso, toIso, toPrismaJson } from "./helpers.js";
import { loadBrand } from "./brand-service.js";
import { decryptToken } from "../utils/token-encryption.js";
import { learnFromContent } from "./ai-client.js";
import { triggerWebhookEvent } from "./webhook-service.js";
import * as linkedin from "./linkedin-api.js";
import * as twitter from "./twitter-api.js";
import * as tiktok from "./tiktok-api.js";
import * as youtube from "./youtube-api.js";

type PrismaPostRecord = Prisma.PostGetPayload<Record<string, never>>;

export function serializePost(post: PrismaPostRecord) {
  return PostRecordSchema.parse({
    id: post.id,
    workspaceId: post.workspaceId,
    brandId: post.brandId,
    platform: post.platform,
    status: post.status.toLowerCase(),
    caption: post.caption ?? "",
    hashtags: post.hashtags,
    mediaUrls: post.mediaUrls,
    scheduledAt: toIso(post.scheduledAt),
    publishedAt: toIso(post.publishedAt),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  });
}

export async function ensureWorkspace(workspaceId: string): Promise<void> {
  await prisma.workspace.upsert({
    where: { id: workspaceId },
    update: {},
    create: { id: workspaceId, name: workspaceId, slug: workspaceId },
  });
}

export async function listPosts(workspaceId: string) {
  const posts = await prisma.post.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
  return posts.map(serializePost);
}

export async function getPost(workspaceId: string, postId: string) {
  const post = await prisma.post.findFirst({ where: { id: postId, workspaceId } });
  if (!post) return null;
  return serializePost(post);
}

export async function createPost(workspaceId: string, input: any) {
  const brand = await loadBrand(input.brandId);
  if (brand.workspaceId !== workspaceId) {
    throw new ApiError(400, "brand_workspace_mismatch", "Brand does not belong to this workspace.");
  }
  const post = await prisma.post.create({
    data: {
      workspaceId,
      brandId: input.brandId,
      platform: input.platform,
      status: input.scheduledAt ? "SCHEDULED" : "DRAFT",
      caption: input.caption,
      hashtags: input.hashtags ?? [],
      mediaUrls: input.mediaUrls ?? [],
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
    },
  });
  return serializePost(post);
}

export async function updatePost(workspaceId: string, postId: string, input: { caption?: string; scheduledAt?: string | null }) {
  const post = await prisma.post.findFirst({ where: { id: postId, workspaceId } });
  if (!post) throw new ApiError(404, "not_found", "Post not found.");
  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      ...(input.caption !== undefined ? { caption: input.caption } : {}),
      ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null } : {}),
    },
  });
  return serializePost(updated);
}

export async function updatePostStatus(workspaceId: string, postId: string, input: { status: string; scheduledAt?: string }) {
  const post = await prisma.post.findFirst({ where: { id: postId, workspaceId } });
  if (!post) throw new ApiError(404, "not_found", "Post not found.");
  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      status: input.status.toUpperCase() as any,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : post.scheduledAt,
      publishedAt: input.status === "published" ? new Date() : post.publishedAt,
    },
  });

  if (input.status === "published") {
    void publishPost(workspaceId, postId);
  }
  if (input.status === "scheduled") {
    void triggerWebhookEvent(workspaceId, "POST_SCHEDULED", { postId, platform: post.platform, scheduledAt: input.scheduledAt });
  }
  return serializePost(updated);
}

export async function deletePost(workspaceId: string, postId: string): Promise<void> {
  const post = await prisma.post.findFirst({ where: { id: postId, workspaceId }, select: { id: true } });
  if (!post) throw new ApiError(404, "not_found", "Post not found.");
  await prisma.post.delete({ where: { id: postId } });
  void triggerWebhookEvent(workspaceId, "POST_DELETED", { postId });
}

export async function publishPostToMeta(workspaceId: string, postId: string): Promise<void> {
  const logger = (await import("pino")).default({ level: "info" });

  const post = await prisma.post.findFirst({ where: { id: postId, workspaceId } });
  if (!post) { logger.warn({ postId }, "Post not found for publishing"); return; }

  const account = await prisma.socialAccount.findFirst({
    where: { workspaceId, platform: post.platform },
  });
  if (!account?.connected) {
    logger.warn({ postId, platform: post.platform }, "No connected account found");
    await prisma.post.update({ where: { id: postId }, data: { status: "FAILED" } });
    return;
  }

  const accessToken = account.accessToken;
  const pageAccessToken = account.pageAccessToken;
  const isMock = !accessToken || accessToken.startsWith("mock-");
  if (isMock) {
    logger.info({ postId, platform: post.platform }, "Simulating successful publish (mock token)");
    await prisma.post.update({ where: { id: postId }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    return;
  }

  const hashtagsStr = post.hashtags.length > 0 ? "\n\n" + post.hashtags.join(" ") : "";
  const message = `${post.caption || ""}${hashtagsStr}`;

  try {
    if (post.platform === "facebook") {
      const fbToken = pageAccessToken || accessToken;
      const mediaUrl = post.mediaUrls[0];
      if (mediaUrl) {
        await fetch(`https://graph.facebook.com/v18.0/${account.id}/photos`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: mediaUrl, message, access_token: fbToken }),
        });
      } else {
        await fetch(`https://graph.facebook.com/v18.0/${account.id}/feed`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, access_token: fbToken }),
        });
      }
    } else if (post.platform === "instagram") {
      const mediaUrl = post.mediaUrls[0] || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800";
      const isVideo = Boolean(mediaUrl.match(/\.(mp4|mov|avi|m4v|webm)/i));
      const containerRes = await fetch(`https://graph.facebook.com/v18.0/${account.id}/media`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isVideo
          ? { media_type: "REELS", video_url: mediaUrl, caption: message, access_token: accessToken }
          : { image_url: mediaUrl, caption: message, access_token: accessToken }),
      });
      const containerData = await containerRes.json() as any;
      const containerId = containerData.id;
      await fetch(`https://graph.facebook.com/v18.0/${account.id}/media_publish`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
      });
    }
    await prisma.post.update({ where: { id: postId }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    void triggerLearning(post);
  } catch (err: any) {
    logger.error({ err, postId, platform: post.platform }, "Live publishing failed");
    await prisma.post.update({ where: { id: postId }, data: { status: "FAILED" } });
  }
}

export async function publishPost(workspaceId: string, postId: string): Promise<void> {
  const logger = (await import("pino")).default({ level: "info" });

  const post = await prisma.post.findFirst({ where: { id: postId, workspaceId } });
  if (!post) { logger.warn({ postId }, "Post not found"); return; }

  if (post.platform === "instagram-basic") {
    logger.warn({ postId }, "Instagram Basic Display API is read-only; cannot publish.");
    await prisma.post.update({ where: { id: postId }, data: { status: "FAILED" } });
    return;
  }

  if (["facebook", "instagram"].includes(post.platform)) {
    return publishPostToMeta(workspaceId, postId);
  }

  const account = await prisma.socialAccount.findFirst({
    where: { workspaceId, platform: post.platform, connected: true },
  });
  if (!account?.accessToken) {
    logger.warn({ postId, platform: post.platform }, "No connected account or missing token");
    await prisma.post.update({ where: { id: postId }, data: { status: "FAILED" } });
    return;
  }

  const token = decryptToken(account.accessToken);
  const hashtagsStr = post.hashtags.length > 0 ? "\n\n" + post.hashtags.join(" ") : "";
  const caption = `${post.caption || ""}${hashtagsStr}`;
  const mediaUrl = post.mediaUrls[0];

  try {
    if (post.platform === "linkedin") {
      const authorId = ((account.metadata as any)?.pageId) || account.platformUserId;
      if (mediaUrl) {
        await linkedin.createPostWithMedia({ accessToken: token, authorId, text: caption, mediaUrl, mediaTitle: "Post media" });
      } else {
        await linkedin.createUgcPost({ accessToken: token, authorId, text: caption });
      }
    } else if (post.platform === "twitter") {
      if (mediaUrl) {
        await twitter.createTweetWithMedia({ accessToken: token, text: caption, mediaUrl });
      } else {
        await twitter.createTweet(token, caption);
      }
    } else if (post.platform === "tiktok" && mediaUrl) {
      await tiktok.uploadVideo({ accessToken: token, openId: account.platformUserId, videoUrl: mediaUrl, caption });
    } else if (post.platform === "youtube" && mediaUrl) {
      await youtube.uploadVideo({ accessToken: token, videoUrl: mediaUrl, title: caption.slice(0, 100), description: caption, tags: post.hashtags });
    }
    await prisma.post.update({ where: { id: postId }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    void triggerLearning(post);
    void triggerWebhookEvent(workspaceId, "POST_PUBLISHED", { postId: post.id, platform: post.platform, caption: post.caption });
  } catch (err: any) {
    logger.error({ err, postId, platform: post.platform }, `Live ${post.platform} publishing failed`);
    await prisma.post.update({ where: { id: postId }, data: { status: "FAILED" } });
    void triggerWebhookEvent(workspaceId, "POST_FAILED", { postId: post.id, platform: post.platform, error: err?.message });
  }
}

async function triggerLearning(post: PrismaPostRecord): Promise<void> {
  try {
    await learnFromContent({
      post_id: post.id,
      workspace_id: post.workspaceId,
      brand_id: post.brandId,
      platform: post.platform,
      caption: post.caption ?? "",
      hashtags: post.hashtags,
      media_urls: post.mediaUrls,
      engagement: { impressions: 0, likes: 0, comments: 0, shares: 0 },
      performance_score: 0.5,
    });
  } catch {
    // Non-critical: learning is fire-and-forget
  }
}
