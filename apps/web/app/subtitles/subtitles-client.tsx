"use client";

import { useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

export function SubtitlesClient() {
  const [scenes, setScenes] = useState<Array<{ scene_number: number; spoken_text: string; start_seconds: number; end_seconds: number }>>([
    { scene_number: 1, spoken_text: "", start_seconds: 0, end_seconds: 5 },
  ]);
  const [format, setFormat] = useState("srt");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ content: string; format: string; total_duration_seconds: number } | null>(null);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  function addScene() {
    const i = scenes.length;
    const lastEnd = scenes[i - 1]?.end_seconds ?? 0;
    setScenes(prev => [...prev, { scene_number: i + 1, spoken_text: "", start_seconds: lastEnd, end_seconds: lastEnd + 5 }]);
  }

  function removeScene(i: number) {
    setScenes(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, scene_number: idx + 1 })));
  }

  function updateScene(i: number, field: string, value: any) {
    setScenes(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  async function generate() {
    if (!scenes.some(s => s.spoken_text.trim())) { setStatus("At least one scene needs spoken text."); return; }
    setGenerating(true); setStatus("Generating subtitles..."); setResult(null);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/generate/subtitles`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenes, format }),
      });
      if (!res.ok) throw new Error("API error");
      setResult(await res.json());
      setStatus("Subtitles generated.");
    } catch { setStatus("Generation failed."); }
    finally { setGenerating(false); }
  }

  function download() {
    if (!result) return;
    const blob = new Blob([result.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `subtitles.${result.format}`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="dashboard-grid">
      <div className="panel panel-medium">
        <h2>Subtitle Generator</h2>
        {status && <div style={{ padding: "12px 16px", marginBottom: "16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "13px", color: "var(--accent)" }}>{status}</div>}

        <div className="field">
          <label>Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)}>
            <option value="srt">SRT</option>
            <option value="vtt">VTT</option>
          </select>
        </div>

        <div style={{ display: "grid", gap: "10px", marginBottom: "12px" }}>
          {scenes.map((scene, i) => (
            <div key={i} style={{ padding: "12px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <strong style={{ fontSize: "12px" }}>Scene {scene.scene_number}</strong>
                {scenes.length > 1 && (
                  <button type="button" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0 }} onClick={() => removeScene(i)}>Remove</button>
                )}
              </div>
              <textarea value={scene.spoken_text} onChange={e => updateScene(i, "spoken_text", e.target.value)} placeholder="Spoken text for this scene..." style={{ minHeight: "50px", marginBottom: "6px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Start (s)</label>
                  <input type="number" min={0} step={0.5} value={scene.start_seconds} onChange={e => updateScene(i, "start_seconds", Number(e.target.value))} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>End (s)</label>
                  <input type="number" min={0} step={0.5} value={scene.end_seconds} onChange={e => updateScene(i, "end_seconds", Number(e.target.value))} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" style={{ fontSize: "12px", padding: "6px 14px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg)", cursor: "pointer", marginBottom: "12px" }} onClick={addScene}>+ Add Scene</button>

        <button type="button" className="btn-vox btn-vox-primary" disabled={generating} onClick={() => void generate()} style={{ width: "100%" }}>
          {generating ? "Generating..." : "Generate Subtitles"} <span className="arrow">&gt;</span>
        </button>

        {result && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)", marginBottom: "8px" }}>
              <p className="lede">Duration: {result.total_duration_seconds.toFixed(1)}s | Format: {result.format.toUpperCase()}</p>
            </div>
            <pre style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)", fontSize: "12px", lineHeight: 1.6, maxHeight: "300px", overflow: "auto", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{result.content}</pre>
            <button type="button" className="btn-vox btn-vox-primary" onClick={download} style={{ marginTop: "8px" }}>Download <span className="arrow">&gt;</span></button>
          </div>
        )}
      </div>

      <div className="panel panel-large">
        <h2>Scene Setup</h2>
        <p className="lede">Define each scene's spoken text and time range. The AI will format timestamps and generate subtitle content in SRT or VTT format.</p>
        <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)", marginTop: "12px" }}>
          <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>Tips</h3>
          <ul className="lede" style={{ margin: 0, paddingLeft: "16px", lineHeight: 2 }}>
            <li>Keep scenes under 10 seconds for readability</li>
            <li>Use complete sentences for better timing</li>
            <li>Preview the generated file before using in video</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
