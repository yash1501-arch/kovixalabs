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
const PLATFORM_SPECS: Record<string, { label: string; maxChars: number; tips: string }> = {
  instagram: { label: "Instagram", maxChars: 2200, tips: "Use all 30 hashtags. Carousel posts get 3x engagement. Post when audience is most active." },
  linkedin: { label: "LinkedIn", maxChars: 3000, tips: "Keep under 150 chars for best reach. Use 3-5 hashtags. Tag relevant people and companies." },
  x: { label: "X / Twitter", maxChars: 280, tips: "Keep under 280 chars. Use 1-2 hashtags. Add a media attachment for 3x engagement." },
  facebook: { label: "Facebook", maxChars: 63206, tips: "Keep under 80 chars for highest engagement. Use 1 hashtag. Add a link or image." },
  tiktok: { label: "TikTok", maxChars: 2200, tips: "Hook in first 3 seconds. Use trending sounds. Keep captions short — the video does the work." },
  youtube: { label: "YouTube", maxChars: 5000, tips: "Front-load keywords in first 150 chars. Use 3-5 tags. Add timestamps for long videos." },
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
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"publish" | "delete" | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editSchedule, setEditSchedule] = useState("");
  const [editTime, setEditTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
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

  // Check for pending draft from Content Studio
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("aismos.draft");
      if (raw) {
        const draft = JSON.parse(raw);
        sessionStorage.removeItem("aismos.draft");
        setForm(f => ({
          ...f,
          caption: draft.caption ?? "",
          hashtags: draft.hashtags ?? "",
          platform: draft.platform ?? f.platform,
          brandId: draft.brandId ?? f.brandId
        }));
        setShowForm(true);
      }
    } catch { /* ignore */ }
  }, []);

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

  function openEdit(post: Post) {
    setEditPost(post);
    setEditCaption(post.caption ?? "");
    if (post.scheduledAt) {
      const d = new Date(post.scheduledAt);
      setEditSchedule(d.toISOString().split("T")[0]!);
      setEditTime(d.toTimeString().slice(0, 5));
    } else {
      setEditSchedule("");
      setEditTime("09:00");
    }
  }

  async function saveEdit() {
    if (!editPost) return;
    setSaving(true);
    setMessage("");
    try {
      let scheduledAt: string | undefined;
      if (editSchedule) {
        scheduledAt = new Date(`${editSchedule}T${editTime}:00`).toISOString();
      }
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts/${editPost.id}`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caption: editCaption, scheduledAt })
      });
      if (!res.ok) { setMessage("Save failed"); return; }
      const updated: Post = await res.json();
      setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditPost(updated);
      setMessage("Saved.");
    } catch { setMessage("Save failed"); }
    finally { setSaving(false); }
  }

  async function duplicatePost(post: Post) {
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandId: post.brandId,
          platform: post.platform,
          caption: post.caption,
          hashtags: post.hashtags,
          scheduledAt: undefined,
          mediaUrls: []
        })
      });
      if (res.ok) {
        const created: Post = await res.json();
        setPosts(prev => [created, ...prev]);
        setMessage("Post duplicated.");
        setEditPost(null);
      }
    } catch { setMessage("Duplicate failed."); }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === selectedPosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectedPosts.map(p => p.id)));
    }
  }

  async function bulkPublish() {
    setBulkAction("publish");
    for (const id of selectedIds) {
      try {
        await fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts/${id}/publish`), { method: "POST" });
        setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "published" } : p));
      } catch { /* skip */ }
    }
    setSelectedIds(new Set());
    setBulkAction(null);
    setStatus(`Published ${selectedIds.size} posts.`);
  }

  async function bulkDelete() {
    setBulkAction("delete");
    for (const id of selectedIds) {
      try {
        await fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts/${id}`), { method: "DELETE" });
      } catch { /* skip */ }
    }
    setPosts(prev => prev.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setBulkAction(null);
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
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderBottom: "1px solid var(--border)", marginBottom: "4px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: "var(--fg-muted)" }}>
                    <input type="checkbox" checked={selectedIds.size === selectedPosts.length && selectedPosts.length > 0} onChange={() => selectAll()} />
                    Select All
                  </label>
                  {selectedIds.size > 0 && (
                    <>
                      <span style={{ fontSize: "11px", color: "var(--fg-subtle)" }}>{selectedIds.size} selected</span>
                      <button type="button" className="btn-vox btn-vox-primary" style={{ fontSize: "11px", padding: "4px 10px" }} disabled={bulkAction === "publish"} onClick={() => void bulkPublish()}>
                        {bulkAction === "publish" ? "..." : "Publish All"}
                      </button>
                      <button type="button" className="btn-vox btn-vox-secondary" style={{ fontSize: "11px", padding: "4px 10px" }} disabled={bulkAction === "delete"} onClick={() => void bulkDelete()}>
                        {bulkAction === "delete" ? "..." : "Delete All"}
                      </button>
                    </>
                  )}
                </div>
                {selectedPosts.map(post => (
                  <div key={post.id} className="calendar-item" style={{ position: "relative", cursor: "pointer" }} onClick={() => openEdit(post)}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                      <div onClick={e => e.stopPropagation()} style={{ paddingTop: "2px" }}>
                        <input type="checkbox" checked={selectedIds.has(post.id)} onChange={() => toggleSelect(post.id)} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
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
                          {post.caption.slice(0, 80)}{post.caption.length > 80 ? "..." : ""}
                        </span>
                        {post.scheduledAt && (
                          <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginTop: "6px" }}>
                            {new Date(post.scheduledAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }} onClick={e => e.stopPropagation()}>
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
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Post edit modal */}
      {editPost && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.7)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px"
          }}
          onClick={() => setEditPost(null)}
        >
          <div
            style={{
              background: "var(--bg-base)", border: "1px solid var(--border)",
              borderRadius: "12px", padding: "24px", maxWidth: "560px", width: "100%",
              maxHeight: "80vh", overflowY: "auto"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>
                {editPost.platform.charAt(0).toUpperCase() + editPost.platform.slice(1)}
              </h2>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{
                  fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                  letterSpacing: "0.06em", padding: "4px 10px",
                  background: `${STATUS_COLORS[editPost.status] ?? "var(--fg-muted)"}20`,
                  color: STATUS_COLORS[editPost.status] ?? "var(--fg-muted)",
                  border: `1px solid ${STATUS_COLORS[editPost.status] ?? "var(--border)"}40`
                }}>
                  {editPost.status.replace(/_/g, " ")}
                </span>
                <button
                  type="button"
                  onClick={() => setEditPost(null)}
                  style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "20px", padding: "4px" }}
                >
                  &times;
                </button>
              </div>
            </div>

            {message && (
              <div style={{ padding: "8px 12px", marginBottom: "16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "12px", color: "var(--accent)" }}>
                {message}
              </div>
            )}

            <div className="studio-form">
              <div className="field">
                <label>Caption</label>
                <textarea
                  value={editCaption}
                  onChange={e => setEditCaption(e.target.value)}
                  style={{ minHeight: "100px" }}
                />
                <TemplateFillButton workspaceId={workspaceId} platform={editPost.platform} onFill={caption => setEditCaption(caption)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div className="field">
                  <label>Schedule Date</label>
                  <input type="date" value={editSchedule} onChange={e => setEditSchedule(e.target.value)} />
                </div>
                <div className="field">
                  <label>Time</label>
                  <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} />
                </div>
              </div>
              {editPost.hashtags.length > 0 && (
                <div className="field">
                  <label>Hashtags</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                    {editPost.hashtags.map(t => (
                      <span key={t} style={{ fontSize: "11px", padding: "3px 8px", background: "var(--accent-soft)", borderRadius: "4px", color: "var(--accent)" }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* Platform preview */}
              {(() => {
                const spec = PLATFORM_SPECS[editPost.platform]!;
                const overChars = editCaption.length > spec.maxChars;
                return (
                  <div style={{ marginTop: "12px", padding: "12px", background: "var(--bg-surface)", border: "1px solid var(--border)", fontSize: "12px" }}>
                    <strong style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>
                      {spec.label} Preview
                    </strong>
                    <div style={{ display: "flex", gap: "16px", marginTop: "8px", flexWrap: "wrap" }}>
                      <span>
                        Characters:{" "}
                        <span style={{ color: overChars ? "#EF4444" : "var(--fg)" }}>
                          {editCaption.length}/{spec.maxChars}
                        </span>
                      </span>
                    </div>
                    {overChars && (
                      <p style={{ color: "#EF4444", fontSize: "11px", margin: "4px 0 0 0" }}>
                        Caption exceeds {spec.label}'s character limit by {editCaption.length - spec.maxChars} characters.
                      </p>
                    )}
                    <p style={{ color: "var(--fg-subtle)", fontSize: "11px", margin: "8px 0 0 0", fontStyle: "italic" }}>
                      {spec.tips}
                    </p>
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
                <button type="button" className="btn-vox btn-vox-primary" disabled={saving} onClick={() => void saveEdit()}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" className="btn-vox btn-vox-secondary" onClick={() => void duplicatePost(editPost)}>
                  Duplicate
                </button>
                <a
                  href={`/content?topic=${encodeURIComponent(editCaption)}`}
                  className="btn-vox btn-vox-secondary"
                  style={{ textDecoration: "none" }}
                >
                  Edit in Studio
                </a>
                <a
                  href={`/calendar/posts/${editPost.id}`}
                  className="btn-vox btn-vox-secondary"
                  style={{ textDecoration: "none" }}
                >
                  Full Page
                </a>
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)", background: "none", border: "none", cursor: "pointer", padding: "6px 12px" }}
                  onClick={() => { deletePost(editPost.id); setEditPost(null); }}
                >
                  Delete
                </button>
              </div>
            </div>

            <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border)", fontSize: "11px", color: "var(--fg-subtle)" }}>
              <span>Created: {new Date(editPost.createdAt).toLocaleString()}</span>
              {editPost.publishedAt && <span style={{ marginLeft: "16px" }}>Published: {new Date(editPost.publishedAt).toLocaleString()}</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TemplateFillButton({ workspaceId, platform, onFill }: { workspaceId: string; platform: string; onFill: (caption: string) => void }) {
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; caption: string; platform: string }>>([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/templates`);
      if (res.ok) setTemplates(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); setShow(true); }
  }

  const filtered = templates.filter(t => t.platform === platform || templates.length <= 3);

  return (
    <div style={{ marginTop: "4px" }}>
      <button type="button" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 10px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer" }} onClick={() => void loadTemplates()}>
        {loading ? "..." : "Fill from Template"}
      </button>
      {show && filtered.length > 0 && (
        <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {filtered.map(t => (
            <button key={t.id} type="button" style={{ fontSize: "12px", padding: "6px 10px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg)", cursor: "pointer", textAlign: "left" }} onClick={() => { onFill(t.caption); setShow(false); }}>
              <strong>{t.name}</strong>
              <span style={{ marginLeft: "8px", color: "var(--fg-muted)" }}>{t.caption.slice(0, 60)}...</span>
            </button>
          ))}
        </div>
      )}
      {show && filtered.length === 0 && !loading && (
        <span style={{ fontSize: "11px", color: "var(--fg-subtle)", marginLeft: "8px" }}>No templates available</span>
      )}
    </div>
  );
}
