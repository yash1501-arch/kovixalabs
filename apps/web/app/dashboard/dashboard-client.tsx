"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Stats = {
  brands: number;
  aiTasks: number;
  draftPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  connectedAccounts: number;
};

type Post = {
  id: string;
  platform: string;
  status: string;
  caption: string;
  scheduledAt: string | null;
  createdAt: string;
};

type ActivityItem = {
  id: string;
  type: "post_published" | "post_failed" | "post_scheduled" | "campaign_status" | "trend_detected";
  message: string;
  timestamp: string;
  link?: string;
};

const pipeline = [
  { label: "Brand Memory", status: "ready", href: "/brands" },
  { label: "Content Studio", status: "ready", href: "/content" },
  { label: "Scheduling", status: "ready", href: "/calendar" },
  { label: "Integrations", status: "ready", href: "/integrations" },
  { label: "Analytics", status: "ready", href: "/analytics" }
] as const;

const actions: { label: string; href: string; primary?: boolean }[] = [
  { label: "Generate Caption", href: "/content", primary: true },
  { label: "Schedule Post", href: "/calendar" },
  { label: "Connect Channels", href: "/integrations" },
  { label: "View Analytics", href: "/analytics" },
  { label: "Brand Memory", href: "/brands" }
];

export function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const workspaceId = getWorkspaceId();

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, postsRes, actRes] = await Promise.all([
          fetch(apiUrl(`/v1/workspaces/${workspaceId}/stats`)),
          fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts`)),
          fetch(apiUrl(`/v1/workspaces/${workspaceId}/activity`))
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (postsRes.ok) {
          const posts: Post[] = await postsRes.json();
          setRecentPosts(posts.slice(0, 5));
        }
        if (actRes.ok) setActivity(await actRes.json());
      } catch {
        // show zeros on API unavailability
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [workspaceId]);

  return (
    <section className="dashboard-grid" aria-label="Dashboard overview">
      {/* Metrics row */}
      <div className="full-width">
        <div className="metric-row">
          {[
            { label: "Brands", value: stats?.brands ?? 0 },
            { label: "AI Tasks", value: stats?.aiTasks ?? 0 },
            { label: "Scheduled", value: stats?.scheduledPosts ?? 0 },
            { label: "Published", value: stats?.publishedPosts ?? 0 },
            { label: "Drafts", value: stats?.draftPosts ?? 0 },
            { label: "Channels", value: stats?.connectedAccounts ?? 0 }
          ].map((m) => (
            <div className="metric" key={m.label}>
              <span>{m.label}</span>
              <strong>{loading ? "—" : m.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Posts */}
      <div className="panel panel-large">
        <h2>Recent Posts</h2>
        {loading ? (
          <p className="lede">Loading posts...</p>
        ) : recentPosts.length === 0 ? (
          <div className="empty-state">
            <p className="lede">No posts yet. Generate your first caption in the Content Studio.</p>
            <a href="/content" className="btn-vox btn-vox-primary">
              Open Content Studio <span className="arrow">-&gt;</span>
            </a>
          </div>
        ) : (
          <div className="calendar-list">
            {recentPosts.map((post) => (
              <div key={post.id} className="calendar-item">
                <div className="post-header">
                  <strong>{post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}</strong>
                  <span className={`post-status status-${post.status}`}>
                    {post.status.replace(/_/g, " ")}
                  </span>
                </div>
                <span className="post-caption">
                  {post.caption.slice(0, 90)}{post.caption.length > 90 ? "…" : ""}
                </span>
                {post.scheduledAt && (
                  <span className="post-time">
                    {new Date(post.scheduledAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operating Loop */}
      <div className="panel panel-medium">
        <h2>Operating Loop</h2>
        <div className="pipeline">
          {pipeline.map((step) => (
            <a href={step.href} className="pipeline-step" key={step.label}>
              <div>
                <strong>{step.label}</strong>
                <span>Phase 1 active</span>
              </div>
              <span className={`status ${step.status}`}>
                {step.status === "ready" ? "Ready" : "Next"}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="panel panel-medium">
        <h2>Activity</h2>
        {loading ? (
          <p className="lede">Loading activity...</p>
        ) : activity.length === 0 ? (
          <p className="lede">No recent activity. Publish posts and run campaigns to see events here.</p>
        ) : (
          <div className="calendar-list" style={{ maxHeight: "300px", overflowY: "auto" }}>
            {activity.map(a => {
              const dotColor = a.type === "post_published" ? "#10B981"
                : a.type === "post_failed" ? "#EF4444"
                : a.type === "post_scheduled" ? "#3B82F6"
                : a.type === "campaign_status" ? "#F59E0B"
                : "var(--fg-subtle)";
              const content = (
                <div key={a.id} className="calendar-item" style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor, marginTop: "6px", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "13px", color: "var(--fg)", display: "block" }}>{a.message}</span>
                    <span style={{ fontSize: "11px", color: "var(--fg-subtle)", display: "block" }}>
                      {new Date(a.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
              return a.link ? <a key={a.id} href={a.link} style={{ textDecoration: "none", color: "inherit" }}>{content}</a> : content;
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="panel panel-full">
        <h2>Quick Actions</h2>
        <div className="actions-row">
          {actions.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className={`btn-vox ${a.primary ? "btn-vox-primary" : "btn-vox-secondary"}`}
            >
              {a.label}{a.primary ? <span className="arrow">-&gt;</span> : null}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
