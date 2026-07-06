"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

const PLATFORM_NAMES: Record<string, string> = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube" };

type Brand = { id: string; name: string };

export function BatchContentClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState({ brandId: "", platform: "linkedin", topic: "", objective: "awareness", tone: "", variantCount: 3, generateImages: false, generateVideoScript: false });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const workspaceId = getWorkspaceId();

  useEffect(() => {
    fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`))
      .then(r => r.ok ? r.json() : [])
      .then((b: Brand[]) => { setBrands(b); const first = b[0]; if (first) setForm(f => ({ ...f, brandId: first.id })); })
      .catch(() => {});
  }, [workspaceId]);

  async function generate() {
    if (!form.brandId || !form.topic) { setStatus("Brand and topic are required."); return; }
    setGenerating(true); setStatus("Generating batch content..."); setResult(null);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/generate/batch`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandId: form.brandId, platform: form.platform, topic: form.topic,
          objective: form.objective, tone: form.tone || undefined,
          variantCount: form.variantCount, generateImages: form.generateImages,
          generateVideoScript: form.generateVideoScript,
        }),
      });
      if (!res.ok) throw new Error("API error");
      setResult(await res.json());
      setStatus("Batch content generated.");
    } catch { setStatus("Generation failed."); }
    finally { setGenerating(false); }
  }

  async function copyCaption(caption: string, id: string) {
    await navigator.clipboard.writeText(caption);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section className="dashboard-grid">
      <div className="panel panel-medium">
        <h2>Batch Content Generation</h2>
        {status && <div style={{ padding: "12px 16px", marginBottom: "16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "13px", color: "var(--accent)" }}>{status}</div>}

        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div className="field"><label>Brand</label><select value={form.brandId} onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))}>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select></div>
            <div className="field"><label>Platform</label><select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
              {Object.entries(PLATFORM_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          </div>
          <div className="field"><label>Topic</label><input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. AI-powered marketing automation" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            <div className="field"><label>Objective</label><select value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}>
              <option value="awareness">Awareness</option><option value="engagement">Engagement</option><option value="conversion">Conversion</option><option value="education">Education</option>
            </select></div>
            <div className="field"><label>Tone (optional)</label><input value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} placeholder="e.g. professional, casual" /></div>
            <div className="field"><label>Variants</label><input type="number" min={1} max={10} value={form.variantCount} onChange={e => setForm(f => ({ ...f, variantCount: Number(e.target.value) }))} /></div>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="checkbox" checked={form.generateImages} onChange={e => setForm(f => ({ ...f, generateImages: e.target.checked }))} />
              Generate images
            </label>
            <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="checkbox" checked={form.generateVideoScript} onChange={e => setForm(f => ({ ...f, generateVideoScript: e.target.checked }))} />
              Generate video script
            </label>
          </div>
        </div>

        <button type="button" className="btn-vox btn-vox-primary" disabled={generating || !form.topic} onClick={() => void generate()} style={{ marginTop: "16px", width: "100%" }}>
          {generating ? "Generating..." : `Generate ${form.variantCount} Variants`} <span className="arrow">&gt;</span>
        </button>

        {result && (
          <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
            <p className="lede">Model used: {result.model}</p>
            {result.variants?.map((v: any) => (
              <div key={v.id} style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <p style={{ fontSize: "13px", lineHeight: 1.6, margin: "0 0 8px", flex: 1 }}>{v.caption}</p>
                  <button type="button" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", background: "none", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer", whiteSpace: "nowrap", marginLeft: "8px" }} onClick={() => void copyCaption(v.caption, v.id)}>
                    {copied === v.id ? "Copied!" : "Copy"}
                  </button>
                </div>
                {v.rationale && <p style={{ fontSize: "12px", color: "var(--fg-muted)", fontStyle: "italic", margin: "0 0 6px" }}>{v.rationale}</p>}
                {v.hashtags?.length > 0 && (
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {v.hashtags.map((h: string) => <span key={h} style={{ fontSize: "10px", padding: "2px 6px", background: "var(--accent-soft)", borderRadius: "4px", color: "var(--accent)" }}>{h}</span>)}
                  </div>
                )}
              </div>
            ))}
            {result.video_script && (
              <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Video Script: {result.video_script.title}</h3>
                <p className="lede" style={{ fontStyle: "italic" }}>{result.video_script.hook}</p>
                {result.video_script.scenes?.map((s: any) => (
                  <div key={s.scene_number} style={{ marginTop: "8px", padding: "10px", background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <strong style={{ fontSize: "11px" }}>Scene {s.scene_number} ({s.duration_seconds}s)</strong>
                    <p style={{ fontSize: "12px", margin: "4px 0", color: "var(--fg-muted)" }}>{s.visual_description}</p>
                    <p style={{ fontSize: "13px", margin: 0 }}>{s.spoken_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel panel-large">
        <h2>About Batch Generation</h2>
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>What You Get</h3>
            <p className="lede">N caption variants with rationale and hashtag sets, optionally with a video script and image generation — all from a single prompt.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
