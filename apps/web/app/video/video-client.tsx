"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type VideoScene = {
  sceneNumber: number;
  duration: number;
  visualDescription: string;
  voiceover: string;
  textOverlay: string;
  cameraAngle: string;
};

type VideoScript = {
  id: string;
  workspaceId: string;
  brandId: string;
  platform: string;
  topic: string;
  duration: number;
  style: string;
  title: string;
  hook: string;
  scenes: VideoScene[];
  cta: string;
  hashtags: string[];
  createdAt: string;
};

type Brand = { id: string; name: string };

const PLATFORMS = [
  { value: "reels", label: "Instagram Reels" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube_short", label: "YouTube Short" },
  { value: "youtube_long", label: "YouTube Long" },
  { value: "story", label: "Story" }
];

const DURATIONS = [
  { value: "15", label: "15 seconds" },
  { value: "30", label: "30 seconds" },
  { value: "60", label: "60 seconds" },
  { value: "90", label: "90 seconds" }
];

const STYLES = [
  { value: "educational", label: "Educational" },
  { value: "entertaining", label: "Entertaining" },
  { value: "promotional", label: "Promotional" },
  { value: "storytelling", label: "Storytelling" }
];

const STYLE_COLORS: Record<string, string> = {
  educational: "#3B82F6",
  entertaining: "#F59E0B",
  promotional: "var(--accent)",
  storytelling: "#8B5CF6"
};

export function VideoAIClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState({
    brandId: "",
    platform: "reels",
    topic: "",
    duration: "30",
    style: "educational"
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<VideoScript | null>(null);
  const [savedScripts, setSavedScripts] = useState<VideoScript[]>([]);
  const [status, setStatus] = useState("");
  const [expandedScriptId, setExpandedScriptId] = useState<string | null>(null);
  const workspaceId = getWorkspaceId();

  async function loadData() {
    try {
      const [scriptsRes, brandsRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/video-scripts`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`))
      ]);
      if (scriptsRes.ok) setSavedScripts(await scriptsRes.json());
      if (brandsRes.ok) {
        const b: Brand[] = await brandsRes.json();
        setBrands(b);
        const first = b[0];
        if (first) setForm(f => ({ ...f, brandId: first.id }));
      }
    } catch { /* silently fail */ }
  }

  useEffect(() => { void loadData(); }, []);

  async function generate() {
    if (!form.brandId || !form.topic) { setStatus("Please select a brand and enter a topic."); return; }
    setIsGenerating(true);
    setStatus("Generating video script...");
    setResult(null);
    try {
      const res = await fetch(apiUrl(`/v1/brands/${form.brandId}/video/script`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, workspaceId })
      });
      if (!res.ok) throw new Error("API error");
      const script: VideoScript = await res.json();
      setResult(script);
      setStatus("Script generated successfully.");
    } catch { setStatus("Failed to generate script."); }
    finally { setIsGenerating(false); }
  }

  function saveScript() {
    if (!result) return;
    setSavedScripts(prev => {
      if (prev.some(s => s.id === result.id)) return prev;
      return [result, ...prev];
    });
    setStatus("Script saved.");
  }

  async function deleteScript(id: string) {
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/video-scripts/${id}`), { method: "DELETE" });
      setSavedScripts(prev => prev.filter(s => s.id !== id));
      if (result?.id === id) setResult(null);
    } catch { /* silently fail */ }
  }

  return (
    <section className="dashboard-grid">
      {/* Left: Generation form */}
      <div className="panel panel-medium" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Generate Script</h2>

        {status && (
          <p style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)", margin: 0 }}>{status}</p>
        )}

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
            {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Topic</label>
          <input
            value={form.topic}
            onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
            placeholder="e.g. How to use our product in 3 steps"
          />
        </div>

        <div className="field">
          <label>Duration</label>
          <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}>
            {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Style</label>
          <select value={form.style} onChange={e => setForm(f => ({ ...f, style: e.target.value }))}>
            {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <button
          type="button"
          className="btn-vox btn-vox-primary"
          disabled={isGenerating}
          onClick={() => void generate()}
        >
          {isGenerating ? "Generating..." : "Generate Script"} <span className="arrow">-&gt;</span>
        </button>
      </div>

      {/* Right: Result display */}
      <div className="panel panel-large" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {!result ? (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "300px", gap: "16px" }}>
            <p className="lede">Fill in the form and generate a video script.</p>
          </div>
        ) : (
          <>
            {/* Script header */}
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <h2 style={{ margin: 0, borderBottom: "none", padding: 0, flex: 1 }}>{result.title}</h2>
                <span style={{
                  fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em",
                  padding: "4px 10px", background: `${STYLE_COLORS[result.style] ?? "var(--accent)"}18`,
                  color: STYLE_COLORS[result.style] ?? "var(--accent)",
                  border: `1px solid ${STYLE_COLORS[result.style] ?? "var(--accent)"}40`,
                  whiteSpace: "nowrap"
                }}>{result.style}</span>
              </div>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-muted)", margin: "6px 0 0" }}>
                {result.platform} · {result.duration}s
              </p>
            </div>

            {/* Hook */}
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "6px" }}>HOOK</div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "var(--fg)", fontStyle: "italic", margin: 0, lineHeight: 1.5 }}>{result.hook}</p>
            </div>

            {/* Scenes */}
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "10px" }}>
                SCENES ({result.scenes.length})
              </div>
              <div style={{ display: "grid", gap: "10px" }}>
                {result.scenes.map(scene => (
                  <div key={scene.sceneNumber} style={{
                    display: "grid", gridTemplateColumns: "32px 1fr",
                    gap: "12px", padding: "14px",
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    borderLeft: "3px solid var(--accent)"
                  }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>
                      {scene.sceneNumber}
                    </div>
                    <div style={{ display: "grid", gap: "8px" }}>
                      <div>
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-muted)" }}>Visual · </span>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg)" }}>{scene.visualDescription}</span>
                      </div>
                      <div>
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-muted)" }}>Voiceover · </span>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg)", fontStyle: "italic" }}>{scene.voiceover}</span>
                      </div>
                      {scene.textOverlay && (
                        <div>
                          <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-muted)" }}>Text · </span>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg)" }}>{scene.textOverlay}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-muted)" }}>Camera: </span>
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", padding: "2px 8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--fg-subtle)" }}>{scene.cameraAngle}</span>
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", padding: "2px 8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--fg-subtle)" }}>{scene.duration}s</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "6px" }}>CALL TO ACTION</div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg)", margin: 0 }}>{result.cta}</p>
            </div>

            {/* Hashtags */}
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "8px" }}>HASHTAGS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {result.hashtags.map(tag => (
                  <span key={tag} style={{ fontFamily: "var(--font-heading)", fontSize: "11px", padding: "3px 10px", background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid rgba(236,0,47,0.2)" }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Save button */}
            <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
              <button type="button" className="btn-vox btn-vox-secondary" onClick={saveScript}>
                Save Script
              </button>
            </div>
          </>
        )}
      </div>

      {/* Saved scripts — full width below */}
      {savedScripts.length > 0 && (
        <div className="panel" style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Saved Scripts</h2>
          <div style={{ display: "grid", gap: "10px" }}>
            {savedScripts.map(script => (
              <div key={script.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em", color: "var(--fg)" }}>{script.title}</div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-muted)", marginTop: "4px" }}>
                      {script.platform} · {script.duration}s · {script.topic}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="btn-vox btn-vox-secondary"
                      style={{ fontSize: "11px", padding: "5px 12px" }}
                      onClick={() => setExpandedScriptId(expandedScriptId === script.id ? null : script.id)}
                    >
                      {expandedScriptId === script.id ? "Hide" : "View"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteScript(script.id)}
                      style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", color: "var(--fg-subtle)", background: "none", border: "none", cursor: "pointer", padding: "5px 8px" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {expandedScriptId === script.id && (
                  <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "4px" }}>HOOK</div>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg)", fontStyle: "italic", margin: 0 }}>{script.hook}</p>
                    </div>
                    {script.scenes.map(scene => (
                      <div key={scene.sceneNumber} style={{
                        display: "grid", gridTemplateColumns: "28px 1fr", gap: "10px",
                        padding: "12px", background: "var(--bg-base)", border: "1px solid var(--border)",
                        borderLeft: "3px solid var(--accent)"
                      }}>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 800, color: "var(--accent)" }}>{scene.sceneNumber}</div>
                        <div style={{ display: "grid", gap: "4px" }}>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--fg)" }}>{scene.visualDescription}</div>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--fg-muted)", fontStyle: "italic" }}>{scene.voiceover}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
