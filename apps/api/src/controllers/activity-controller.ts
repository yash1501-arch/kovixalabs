import type { Request, Response } from "express";
import { prisma } from "../db.js";

type ActivityItem = {
  id: string;
  type: "post_published" | "post_failed" | "post_scheduled" | "campaign_status" | "trend_detected";
  message: string;
  timestamp: string;
  link?: string;
};

export async function listActivity(request: Request, response: Response) {
  const workspaceId = request.params.workspaceId;
  const activities: ActivityItem[] = [];

  // Recent posts (published, failed, scheduled)
  const recentPosts = await prisma.post.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: {
      id: true, status: true, caption: true, platform: true,
      updatedAt: true, publishedAt: true, scheduledAt: true,
    },
  });

  for (const post of recentPosts) {
    if (post.status === "PUBLISHED") {
      activities.push({
        id: `post-pub-${post.id}`,
        type: "post_published",
        message: `${post.platform} post published`,
        timestamp: (post.publishedAt ?? post.updatedAt).toISOString(),
        link: `/calendar`,
      });
    } else if (post.status === "FAILED") {
      activities.push({
        id: `post-fail-${post.id}`,
        type: "post_failed",
        message: `${post.platform} post failed to publish`,
        timestamp: post.updatedAt.toISOString(),
        link: `/calendar`,
      });
    } else if (post.status === "SCHEDULED" && post.scheduledAt) {
      activities.push({
        id: `post-sch-${post.id}`,
        type: "post_scheduled",
        message: `${post.platform} post scheduled`,
        timestamp: post.updatedAt.toISOString(),
        link: `/calendar`,
      });
    }
  }

  // Recent campaign status changes
  const recentCampaigns = await prisma.adCampaign.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, status: true, objective: true, platform: true, updatedAt: true },
  });

  for (const c of recentCampaigns) {
    if (c.status === "active" || c.status === "completed" || c.status === "paused") {
      activities.push({
        id: `camp-${c.id}`,
        type: "campaign_status",
        message: `${c.platform} campaign ${c.status}: ${c.objective}`,
        timestamp: c.updatedAt.toISOString(),
        link: `/campaigns`,
      });
    }
  }

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  response.json(activities.slice(0, 20));
}
