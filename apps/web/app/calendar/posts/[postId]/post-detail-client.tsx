"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiUrl } from "../../../lib/api";
import { getWorkspaceId } from "../../../lib/client-auth";

type Post = {
  id: string;
  workspaceId: string;
  brandId: string;
  platform: string;
  status: string;
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const PLATFORM_SPECS: Record<string, { label: string; maxChars: number; tips: string }> = {
  instagram: { label: "Instagram", maxChars: 2200, tips: "Use all 30 hashtags. Carousel posts get 3x engagement." },
  linkedin: { label: "LinkedIn", maxChars: 3000, tips: "Keep under 150 chars for best reach. Use 3-5 hashtags." },
  x: { label: "X / Twitter", maxChars: 280, tips: "Keep under 280 chars. Use 1-2 hashtags. Add media for 3x engagement." },
  facebook: { label: "Facebook", maxChars: 63206, tips: "Keep under 80 chars for highest engagement. Add a link or image." },
  tiktok: { label: "TikTok", maxChars: 2200, tips: "Hook in first 3 seconds. Keep captions short." },
  youtube: { label: "YouTube", maxChars: 5000, tips: "Front-load keywords in first 150 chars. Add timestamps." },
};

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--fg-subtle)", pending_approval: "#F59E0B", approved: "#10B981",
  scheduled: "#3B82F6", published: "var(--accent)", failed: "#EF4444", rejected: "#6B7280",
};

export function PostDetailClient() {
  const params = useParams();
  const postId = params.postId as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [caption, setCaption] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const workspaceId = getWorkspaceId();

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts/${postId}`));
      if (!res.ok) throw new Error("Not found");
      const data: Post = await res.json();
      setPost(data);
      setCaption(data.caption ?? "");
      if (data.scheduledAt) {
        const d = new Date(data.scheduledAt);
        setScheduleDate(d.toISOString().split("T")[0]!);
        setScheduleTime(d.toTimeString().slice(0, 5));
      }
    } catch {
      setError("Post not found.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [postId]);

  async function save() {
    if (!post) return;
    setSaving(true);
    setMessage("");
    try {
      const scheduledAt = scheduleDate
        ? new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
        : null;
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts/${post.id}`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caption, scheduledAt }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated: Post = await res.json();
      setPost(updated);
      setMessage("Saved.");
    } catch {
      setMessage("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!post) return;
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts/${post.id}/publish`), { method: "POST" });
      if (!res.ok) throw new Error("Publish failed");
      setPost(prev => prev ? { ...prev, status: "published", publishedAt: new Date().toISOString() } : prev);
      setMessage("Published!");
    } catch {
      setMessage("Publish failed.");
    }
  }

  async function remove() {
    if (!post) return;
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts/${post.id}`), { method: "DELETE" });
      window.location.href = "/calendar";
    } catch {
      setMessage("Delete failed.");
    }
  }

  if (loading) return <section className="dashboard-grid"><div className="panel panel-large"><p className="lede">Loading post...</p></div></section>;
  if (error || !post) return <section className="dashboard-grid"><div className="panel panel-large"><p className="lede">{error}</p><a href="/calendar" className="btn-vox btn-vox-secondary" style={{ marginTop: "16px" }}>Back to Calendar</a></div></section>;

  const spec = PLATFORM_SPECS[post.platform]!;
  const overChars = caption.length > spec.maxChars;

  return (
    <section className="dashboard-grid">
      <div className="panel panel-large">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <a href="/calendar" style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)", textDecoration: "none", display: "block", marginBottom: "8px" }}>&larr; Back to Calendar</a>
            <h2 style={{ margin: 0, borderBottom: "none", padding: 0, display: "flex", alignItems: "center", gap: "12px" }}>
              {spec.label}
              <span style={{
                fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                letterSpacing: "0.06em", padding: "4px 10px",
                background: `${STATUS_COLORS[post.status] ?? "var(--fg-muted)"}20`,
                color: STATUS_COLORS[post.status] ?? "var(--fg-muted)",
                border: `1px solid ${STATUS_COLORS[post.status] ?? "var(--border)"}40`,
              }}>
                {post.status.replace(/_/g, " ")}
              </span>
            </h2>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="btn-vox btn-vox-primary" onClick={() => void save()}>
              {saving ? "Saving..." : "Save"}
            </button>
            {post.status !== "published" && (
              <button type="button" className="btn-vox btn-vox-primary" onClick={() => void publish()}>
                Publish <span className="arrow">&gt;</span>
              </button>
            )}
            <button type="button" className="btn-vox btn-vox-secondary" onClick={() => void remove()}>
              Delete
            </button>
          </div>
        </div>

        {message && (
          <div style={{ padding: "10px 14px", marginBottom: "16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "12px", color: "var(--accent)" }}>
            {message}
          </div>
        )}

        <div className="studio-form">
          <div className="field">
            <label>Caption</label>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} style={{ minHeight: "120px" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="field">
              <label>Schedule Date</label>
              <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Time</label>
              <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
            </div>
          </div>

          {post.hashtags.length > 0 && (
            <div className="field">
              <label>Hashtags</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                {post.hashtags.map(t => (
                  <span key={t} style={{ fontSize: "11px", padding: "3px 8px", background: "var(--accent-soft)", borderRadius: "4px", color: "var(--accent)" }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {post.mediaUrls.length > 0 && (
            <div className="field">
              <label>Media</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                {post.mediaUrls.map((url, i) => (
                  <img key={i} src={url} alt="" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }} />
                ))}
              </div>
            </div>
          )}

          {/* Platform preview */}
          <div style={{ marginTop: "12px", padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <strong style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>
              {spec.label} Preview
            </strong>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px", flexWrap: "wrap" }}>
              <span>Characters: <span style={{ color: overChars ? "#EF4444" : "var(--fg)" }}>{caption.length}/{spec.maxChars}</span></span>
              <span>Hashtags: {post.hashtags.length}</span>
            </div>
            {overChars && <p style={{ color: "#EF4444", fontSize: "11px", margin: "4px 0 0 0" }}>Exceeds limit by {caption.length - spec.maxChars} characters.</p>}
            <p style={{ color: "var(--fg-subtle)", fontSize: "11px", margin: "8px 0 0 0", fontStyle: "italic" }}>{spec.tips}</p>
          </div>
        </div>

        {/* Activity log */}
        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Activity</h3>
          <div style={{ display: "grid", gap: "6px", fontSize: "12px", color: "var(--fg-muted)" }}>
            <div>Created: {new Date(post.createdAt).toLocaleString()}</div>
            <div>Last updated: {new Date(post.updatedAt).toLocaleString()}</div>
            {post.publishedAt && <div>Published: {new Date(post.publishedAt).toLocaleString()}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
