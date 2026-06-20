"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Brand = { id: string; name: string };

type ImagePrompt = {
  id: string;
  workspaceId: string;
  brandId: string;
  platform: string;
  topic: string;
  style: string;
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
  status: string;
  imageUrl: string | null;
  createdAt: string;
};

const PLATFORMS = ["instagram", "linkedin", "x", "facebook", "tiktok", "youtube"] as const;
const ASPECT_RATIOS = ["1:1", "4:5", "16:9", "9:16"] as const;

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E4405F", linkedin: "#0A66C2", x: "#888888",
  facebook: "#1877F2", tiktok: "#69C9D0", youtube: "#FF0000"
};

const ASPECT_LABELS: Record<string, string> = {
  "1:1": "Square", "4:5": "Portrait", "16:9": "Landscape", "9:16": "Story"
};

export function ImagesClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [prompts, setPrompts] = useState<ImagePrompt[]>([]);
  const [form, setForm] = useState({ brandId: "", platform: "instagram", topic: "", style: "", aspectRatio: "1:1" });
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const workspaceId = getWorkspaceId();

  async function loadData() {
    try {
      const [brandsRes, promptsRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/image-prompts`))
      ]);
      if (brandsRes.ok) {
        const b: Brand[] = await brandsRes.json();
        setBrands(b);
        const first = b[0];
        if (first) setForm(f => ({ ...f, brandId: first.id }));
      }
      if (promptsRes.ok) setPrompts(await promptsRes.json());
    } catch { /* silently fail */ }
  }

  useEffect(() => { void loadData(); }, []);

  async function generate() {
    if (!form.brandId || !form.topic) { setStatus("Brand and topic are required."); return; }
    setGenerating(true);
    setStatus("Generating image prompt...");
    try {
      const res = await fetch(apiUrl(`/v1/brands/${form.brandId}/images/prompt`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const prompt: ImagePrompt = await res.json();
      setPrompts(prev => [prompt, ...prev]);
      setStatus("Image concept generated.");
      setForm(f => ({ ...f, topic: "", style: "" }));
    } catch { setStatus("Generation failed."); }
    finally { setGenerating(false); }
  }

  async function deletePrompt(id: string) {
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/image-prompts/${id}`), { method: "DELETE" });
      setPrompts(prev => prev.filter(p => p.id !== id));
    } catch { /* silently fail */ }
  }

  async function copyPrompt(prompt: string, id: string) {
    await navigator.clipboard.writeText(prompt);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const aspectRatioStyle = (ratio: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      "1:1": { width: "100%", paddingBottom: "100%" },
      "4:5": { width: "100%", paddingBottom: "125%" },
      "16:9": { width: "100%", paddingBottom: "56.25%" },
      "9:16": { width: "80%", margin: "0 auto", paddingBottom: "142.22%" }
    };
    return map[ratio] ?? { width: "100%", paddingBottom: "100%" };
  };

  return (
    <section className="dashboard-grid">
      {/* Generation form */}
      <div className="panel panel-medium">
        <h2>Generate Image Concept</h2>
        <div className="studio-form">
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
              {PLATFORMS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Topic / Subject</label>
            <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. team celebrating product launch" />
          </div>
          <div className="field">
            <label>Visual Style (optional)</label>
            <input value={form.style} onChange={e => setForm(f => ({ ...f, style: e.target.value }))} placeholder="e.g. minimalist, dark moody, bright airy" />
          </div>
          <div className="field">
            <label>Aspect Ratio</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {ASPECT_RATIOS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, aspectRatio: r }))}
                  style={{
                    fontFamily: "var(--font-heading)", fontSize: "12px", textTransform: "uppercase",
                    letterSpacing: "0.05em", padding: "8px", cursor: "pointer",
                    background: form.aspectRatio === r ? "var(--accent-soft)" : "var(--bg-surface)",
                    border: `1px solid ${form.aspectRatio === r ? "var(--accent)" : "var(--border)"}`,
                    color: form.aspectRatio === r ? "var(--accent)" : "var(--fg-muted)",
                    transition: "all 0.2s ease"
                  }}
                >
                  {r}<br /><span style={{ fontSize: "10px", fontWeight: 400 }}>{ASPECT_LABELS[r]}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="btn-vox btn-vox-primary"
            disabled={generating || !form.brandId}
            onClick={() => void generate()}
          >
            {generating ? "Generating..." : "Generate Concept"} <span className="arrow">-&gt;</span>
          </button>
          {status && (
            <p style={{ fontFamily: "var(--font-heading)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>{status}</p>
          )}
        </div>
      </div>

      {/* Library */}
      <div className="panel panel-large">
        <h2>Image Library</h2>
        {prompts.length === 0 ? (
          <p className="lede">No image concepts yet. Generate your first one.</p>
        ) : (
          <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {prompts.map(p => (
              <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Image preview */}
                <div style={{ position: "relative", overflow: "hidden", background: "var(--bg-surface)", border: "1px solid var(--border)", ...aspectRatioStyle(p.aspectRatio) }}>
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.topic}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                  <div style={{
                    position: "absolute", top: "8px", left: "8px",
                    fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                    letterSpacing: "0.06em", padding: "2px 8px",
                    background: `${PLATFORM_COLORS[p.platform] ?? "var(--accent)"}cc`,
                    color: "#fff"
                  }}>{p.platform}</div>
                </div>
                {/* Info */}
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--fg)", marginBottom: "4px" }}>
                    {p.topic.slice(0, 40)}{p.topic.length > 40 ? "…" : ""}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--fg-muted)", fontStyle: "italic", lineHeight: 1.4 }}>
                    {p.prompt.slice(0, 80)}…
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => void copyPrompt(p.prompt, p.id)}
                    style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: copied === p.id ? "#22c55e" : "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {copied === p.id ? "Copied!" : "Copy Prompt"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deletePrompt(p.id)}
                    style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
