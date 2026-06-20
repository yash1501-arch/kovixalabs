"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Post = {
  id: string;
  workspaceId: string;
  brandId: string;
  platform: string;
  status: string;
  caption: string;
  hashtags: string[];
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Brand = { id: string; name: string };

const PLATFORMS = ["instagram", "linkedin", "x", "facebook", "tiktok", "youtube"] as const;
const STATUS_COLORS: Record<string, string> = {
  draft: "var(--fg-subtle)",
  pending_approval: "#F59E0B",
  approved: "#10B981",
  scheduled: "#3B82F6",
  published: "var(--accent)",
  failed: "#EF4444",
  rejected: "#6B7280"
};
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const emptyForm = {
  brandId: "",
  platform: "instagram" as string,
  caption: "",
  hashtags: "",
  scheduledAt: "",
  scheduledTime: "09:00"
};

export function CalendarClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const workspaceId = getWorkspaceId();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  async function loadData() {
    try {
      const [postsRes, brandsRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`))
      ]);
      if (postsRes.ok) setPosts(await postsRes.json());
      if (brandsRes.ok) {
        const b: Brand[] = await brandsRes.json();
        setBrands(b);
        const firstBrand = b[0];
        if (firstBrand) setForm(f => ({ ...f, brandId: firstBrand.id }));
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadData(); }, []);

  async function createPost() {
    if (!form.caption || !form.brandId) {
      setStatus("Caption and brand are required.");
      return;
    }
    setSubmitting(true);
    setStatus("");
    try {
      let scheduledAt: string | undefined;
      if (form.scheduledAt) {
        scheduledAt = new Date(`${form.scheduledAt}T${form.scheduledTime}:00`).toISOString();
      }
      const body = {
        brandId: form.brandId,
        platform: form.platform,
        caption: form.caption,
        hashtags: form.hashtags.split(/[\s,]+/).filter(h => h.startsWith("#")),
        scheduledAt,
        mediaUrls: []
      };
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("API error");
      const post: Post = await res.json();
      setPosts(prev => [post, ...prev]);
      setForm(f => ({ ...emptyForm, brandId: f.brandId }));
      setShowForm(false);
      setStatus("Post scheduled successfully.");
    } catch {
      setStatus("Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deletePost(postId: string) {
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts/${postId}`), { method: "DELETE" });
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch { /* silently fail */ }
  }

  async function publishPost(postId: string) {
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts/${postId}`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "published" })
      });
      if (res.ok) {
        const updated: Post = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? updated : p));
      }
    } catch { /* silently fail */ }
  }

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  function getDateStr(day: number): string {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function getPostsForDay(day: number): Post[] {
    const dateStr = getDateStr(day);
    return posts.filter(p => p.scheduledAt?.startsWith(dateStr));
  }

  const selectedPosts = selectedDay
    ? posts.filter(p => p.scheduledAt?.startsWith(selectedDay))
    : posts.filter(p => !p.scheduledAt).slice(0, 10);

  return (
    <>
      {status && (
        <div style={{ marginBottom: "20px", padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontFamily: "var(--font-heading)", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>
          {status}
        </div>
      )}

      <section className="dashboard-grid">
        {/* Calendar grid */}
        <div className="panel panel-large">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="btn-vox btn-vox-secondary"
                style={{ fontSize: "12px", padding: "6px 14px" }}
                onClick={() => {
                  if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
                  else setViewMonth(m => m - 1);
                  setSelectedDay(null);
                }}
              >&#8592;</button>
              <button
                type="button"
                className="btn-vox btn-vox-secondary"
                style={{ fontSize: "12px", padding: "6px 14px" }}
                onClick={() => {
                  if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
                  else setViewMonth(m => m + 1);
                  setSelectedDay(null);
                }}
              >&#8594;</button>
            </div>
          </div>

          {/* Day labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", marginBottom: "4px" }}>
            {DAY_LABELS.map(d => (
              <div key={d} style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-subtle)", textAlign: "center", padding: "6px 0" }}>{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "var(--border)" }}>
            {Array.from({ length: totalCells }, (_, i) => {
              const day = i - firstDay + 1;
              const isValid = day >= 1 && day <= daysInMonth;
              const dateStr = isValid ? getDateStr(day) : "";
              const dayPosts = isValid ? getPostsForDay(day) : [];
              const isToday = isValid && dateStr === now.toISOString().split("T")[0];
              const isSelected = isValid && dateStr === selectedDay;

              return (
                <div
                  key={i}
                  onClick={() => isValid && setSelectedDay(isSelected ? null : dateStr)}
                  style={{
                    background: isSelected ? "var(--accent-soft)" : "var(--bg-base)",
                    border: isSelected ? "1px solid var(--accent)" : "none",
                    minHeight: "72px",
                    padding: "8px",
                    cursor: isValid ? "pointer" : "default",
                    transition: "all 0.2s ease",
                    position: "relative"
                  }}
                >
                  {isValid && (
                    <>
                      <div style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "13px",
                        fontWeight: isToday ? 800 : 500,
                        color: isToday ? "var(--accent)" : "var(--fg-muted)",
                        marginBottom: "4px"
                      }}>
                        {day}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>
                        {dayPosts.slice(0, 3).map(post => (
                          <div
                            key={post.id}
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "2px",
                              background: STATUS_COLORS[post.status] ?? "var(--fg-muted)"
                            }}
                            title={`${post.platform}: ${post.caption.slice(0, 40)}`}
                          />
                        ))}
                        {dayPosts.length > 3 && (
                          <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", color: "var(--fg-subtle)" }}>+{dayPosts.length - 3}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "16px", marginTop: "12px", flexWrap: "wrap" }}>
            {Object.entries(STATUS_COLORS).filter(([s]) => ["draft","scheduled","published","approved"].includes(s)).map(([s, c]) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: c }} />
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel: selected day posts + form */}
        <div className="panel panel-medium" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "0" }}>
            <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>
              {selectedDay ? selectedDay : "Queue"}
            </h2>
            <button
              type="button"
              className="btn-vox btn-vox-primary"
              style={{ fontSize: "12px", padding: "6px 14px" }}
              onClick={() => { setShowForm(f => !f); if (selectedDay) setForm(f => ({ ...f, scheduledAt: selectedDay })); }}
            >
              {showForm ? "Cancel" : "+ Post"}
            </button>
          </div>

          {showForm && (
            <div style={{ display: "grid", gap: "12px", padding: "16px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="field">
                <label>Brand</label>
                <select value={form.brandId} onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))}>
                  <option value="">Select brand</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Platform</label>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Caption</label>
                <textarea value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="Write your post caption..." style={{ minHeight: "80px" }} />
              </div>
              <div className="field">
                <label>Hashtags</label>
                <input value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))} placeholder="#brand #marketing #social" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div className="field">
                  <label>Schedule Date</label>
                  <input type="date" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Time</label>
                  <input type="time" value={form.scheduledTime} onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))} />
                </div>
              </div>
              <button
                type="button"
                className="btn-vox btn-vox-primary"
                disabled={submitting}
                onClick={() => void createPost()}
              >
                {submitting ? "Saving..." : "Schedule Post"} <span className="arrow">-&gt;</span>
              </button>
            </div>
          )}

          <div className="calendar-list" style={{ flex: 1, overflowY: "auto", maxHeight: "480px" }}>
            {loading ? (
              <p className="lede">Loading posts...</p>
            ) : selectedPosts.length === 0 ? (
              <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg-muted)", fontStyle: "italic" }}>
                {selectedDay ? "No posts scheduled for this day." : "No posts in queue yet."}
              </p>
            ) : selectedPosts.map(post => (
              <div key={post.id} className="calendar-item" style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <strong>{post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}</strong>
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "2px 8px",
                      background: `${STATUS_COLORS[post.status] ?? "var(--fg-muted)"}20`,
                      color: STATUS_COLORS[post.status] ?? "var(--fg-muted)",
                      border: `1px solid ${STATUS_COLORS[post.status] ?? "var(--border)"}40`
                    }}
                  >
                    {post.status.replace(/_/g, " ")}
                  </span>
                </div>
                <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg-muted)", fontStyle: "italic", display: "block", marginTop: "4px", lineHeight: "1.4" }}>
                  {post.caption.slice(0, 80)}{post.caption.length > 80 ? "…" : ""}
                </span>
                {post.scheduledAt && (
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginTop: "6px" }}>
                    {new Date(post.scheduledAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  {post.status !== "published" && (
                    <button
                      type="button"
                      style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      onClick={() => void publishPost(post.id)}
                    >
                      Publish
                    </button>
                  )}
                  <button
                    type="button"
                    style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    onClick={() => void deletePost(post.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
