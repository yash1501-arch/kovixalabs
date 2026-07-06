"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Template = {
  id: string;
  workspaceId: string;
  brandId: string | null;
  platform: string;
  name: string;
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  createdAt: string;
  updatedAt: string;
};

type Brand = { id: string; name: string };

const PLATFORMS = ["instagram", "linkedin", "x", "facebook", "tiktok", "youtube"] as const;
const PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube",
};

const emptyForm = { brandId: "", platform: "linkedin", name: "", caption: "", hashtags: "", mediaUrls: "" };

export function TemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const workspaceId = getWorkspaceId();

  async function load() {
    try {
      const [tRes, bRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/templates`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`)),
      ]);
      if (tRes.ok) setTemplates(await tRes.json());
      if (bRes.ok) {
        const b: Brand[] = await bRes.json();
        setBrands(b);
        const first = b[0];
        if (first) setForm(f => ({ ...f, brandId: first.id }));
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function createTemplate() {
    if (!form.name) { setStatus("Template name is required."); return; }
    setSubmitting(true);
    setStatus("");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/templates`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          brandId: form.brandId || undefined,
          hashtags: form.hashtags.split(/[\s,]+/).filter(h => h.startsWith("#")),
        }),
      });
      if (!res.ok) throw new Error("API error");
      setForm(emptyForm);
      setShowForm(false);
      setStatus("Template created.");
      await load();
    } catch { setStatus("Failed to create template."); }
    finally { setSubmitting(false); }
  }

  async function deleteTemplate(id: string) {
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/templates/${id}`), { method: "DELETE" });
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch { /* silently fail */ }
  }

  async function createPostFromTemplate(t: Template) {
    setCreating(true);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/posts`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandId: t.brandId || brands[0]?.id || "",
          platform: t.platform,
          caption: t.caption,
          hashtags: t.hashtags,
          mediaUrls: t.mediaUrls,
        }),
      });
      if (res.ok) {
        setStatus(`Post created from "${t.name}". Go to Calendar to schedule it.`);
      }
    } catch { setStatus("Failed to create post."); }
    finally { setCreating(false); }
  }

  const filtered = filter ? templates.filter(t => t.platform === filter || t.name.toLowerCase().includes(filter.toLowerCase())) : templates;

  return (
    <section className="dashboard-grid">
      {status && (
        <div style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "13px", color: "var(--accent)" }}>
          {status}
        </div>
      )}

      <div className="panel panel-medium" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
          <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Templates ({templates.length})</h2>
          <button type="button" className="btn-vox btn-vox-primary" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={() => setShowForm(f => !f)}>
            {showForm ? "Cancel" : "+ New"}
          </button>
        </div>

        <input
          type="text" placeholder="Filter templates..."
          value={filter} onChange={e => setFilter(e.target.value)}
          style={{ width: "100%", padding: "8px 12px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg)", fontSize: "13px", outline: "none" }}
        />

        {showForm && (
          <div style={{ display: "grid", gap: "10px", padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="field">
              <label>Template Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product Launch Post" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div className="field">
                <label>Platform</label>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_NAMES[p]}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Brand (optional)</label>
                <select value={form.brandId} onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))}>
                  <option value="">Any brand</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Caption</label>
              <textarea value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="Post caption template. Use {{topic}} as placeholder." style={{ minHeight: "80px" }} />
            </div>
            <div className="field">
              <label>Hashtags (space or comma separated)</label>
              <input value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))} placeholder="#ai #marketing #tech" />
            </div>
            <button type="button" className="btn-vox btn-vox-primary" disabled={submitting} onClick={() => void createTemplate()}>
              {submitting ? "Saving..." : "Save Template"} <span className="arrow">&gt;</span>
            </button>
          </div>
        )}

        <div className="calendar-list" style={{ flex: 1, overflowY: "auto" }}>
          {loading ? <p className="lede">Loading...</p> : filtered.length === 0 ? (
            <p className="lede" style={{ fontStyle: "italic" }}>{filter ? "No templates match your filter." : "No templates yet. Save reusable post structures."}</p>
          ) : filtered.map(t => (
            <div key={t.id} className="calendar-item">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <strong>{t.name}</strong>
                  <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--fg-muted)" }}>{PLATFORM_NAMES[t.platform] ?? t.platform}</span>
                </div>
              </div>
              <span style={{ fontSize: "13px", color: "var(--fg-muted)", fontStyle: "italic", display: "block", marginTop: "4px", lineHeight: 1.4 }}>
                {t.caption.slice(0, 100)}{t.caption.length > 100 ? "..." : ""}
              </span>
              {t.hashtags.length > 0 && (
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                  {t.hashtags.slice(0, 5).map(h => <span key={h} style={{ fontSize: "10px", padding: "2px 6px", background: "var(--accent-soft)", borderRadius: "4px", color: "var(--accent)" }}>{h}</span>)}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button type="button" className="btn-vox btn-vox-primary" style={{ fontSize: "11px", padding: "4px 10px" }} disabled={creating} onClick={() => void createPostFromTemplate(t)}>
                  {creating ? "..." : "Create Post"}
                </button>
                <button type="button" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)", background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => void deleteTemplate(t.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel panel-large">
        <h2>About Templates</h2>
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Quick Posts</h3>
            <p className="lede" style={{ fontSize: "13px" }}>
              Save commonly-used post structures as templates. Use <code>{`{{topic}}`}</code> as placeholder in captions.
              Click "Create Post" to instantly create a draft in the calendar.
            </p>
          </div>
          <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Use Cases</h3>
            <ul style={{ fontSize: "13px", color: "var(--fg-muted)", lineHeight: 2, margin: 0, paddingLeft: "20px" }}>
              <li>Weekly tip posts with rotating topics</li>
              <li>Product launch announcements</li>
              <li>Industry news commentary</li>
              <li>Client testimonial shoutouts</li>
              <li>Event promotion templates</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
