"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Brand = { id: string; name: string };
const PLATFORMS = ["instagram", "tiktok", "twitter", "linkedin", "youtube", "facebook"];

export function GenerateHashtagsClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState({ brandId: "", platform: "instagram", topic: "", caption: "" });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ trending: string[]; niche: string[]; branded: string[] } | null>(null);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  useEffect(() => {
    fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`))
      .then(r => r.ok ? r.json() : [])
      .then(setBrands)
      .catch(() => {});
  }, []);

  async function generate() {
    if (!form.topic.trim()) { setStatus("Enter a topic."); return; }
    setGenerating(true);
    setStatus("Generating hashtags...");
    setResult(null);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/generate/hashtags`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setStatus(`Generated ${data.trending.length + data.niche.length + data.branded.length} hashtags.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function copyAll() {
    if (!result) return;
    const all = [...result.trending, ...result.niche, ...result.branded];
    navigator.clipboard.writeText(all.join(" "));
    setStatus("Copied to clipboard!");
  }

  return (
    <section className="dashboard-grid">
      <div className="panel panel-medium">
        <h2>Generate Hashtags</h2>
        {status && <div style={{ padding: "12px 16px", marginBottom: "16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "13px", color: "var(--accent)" }}>{status}</div>}
        <div className="field">
          <label>Brand</label>
          <select value={form.brandId} onChange={e => setForm({ ...form, brandId: e.target.value })}>
            <option value="">No brand</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Platform</label>
          <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Topic</label>
          <input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="e.g., sustainable fashion" />
        </div>
        <div className="field">
          <label>Caption (optional)</label>
          <textarea value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })} placeholder="Post caption for context..." style={{ minHeight: "80px" }} />
        </div>
        <button type="button" className="btn-vox btn-vox-primary" disabled={generating || !form.topic.trim()} onClick={() => void generate()}>
          {generating ? "Generating..." : "Generate Hashtags"} <span className="arrow">&gt;</span>
        </button>
      </div>

      <div className="panel panel-large">
        <h2>Generated Hashtags</h2>
        {!result ? (
          <p className="lede">Your hashtags will appear here.</p>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
              <button type="button" className="btn-vox" onClick={copyAll}>Copy All</button>
            </div>
            {([
              { label: "Trending", key: "trending", color: "var(--accent)" },
              { label: "Niche", key: "niche", color: "#e67e22" },
              { label: "Branded", key: "branded", color: "#2ecc71" },
            ] as const).map(({ label, key, color }) => (
              result[key as keyof typeof result].length > 0 && (
                <div key={key} style={{ marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "13px", color, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {result[key as keyof typeof result].map((h: string) => (
                      <span key={h} style={{ padding: "4px 10px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "13px", cursor: "pointer" }}
                        onClick={() => { navigator.clipboard.writeText(h); setStatus(`Copied ${h}`); }}>
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )
            ))}
          </>
        )}
      </div>
    </section>
  );
}
