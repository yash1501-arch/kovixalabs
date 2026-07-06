"use client";

import { useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

const STYLES = ["natural", "glamour", "professional", "cinematic", "soft", "vibrant"];

export function FaceEnhancementClient() {
  const [imageUrl, setImageUrl] = useState("");
  const [style, setStyle] = useState("natural");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    task_id: string;
    enhancements: Array<{ type: string; description: string; intensity: number; priority: string }>;
    processing_parameters: Record<string, unknown>;
    estimated_time_seconds: number;
  } | null>(null);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  async function analyze() {
    if (!imageUrl.trim()) { setStatus("Enter an image URL."); return; }
    setAnalyzing(true);
    setStatus("Analyzing face image...");
    setResult(null);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/face/enhance`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageUrl, style }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setStatus(`Analysis complete — ${data.enhancements.length} enhancements recommended.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="dashboard-grid">
      <div className="panel panel-medium">
        <h2>Face Enhancement</h2>
        {status && <div style={{ padding: "12px 16px", marginBottom: "16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "13px", color: "var(--accent)" }}>{status}</div>}

        <div className="field">
          <label>Image URL</label>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/face.jpg" />
        </div>
        {imageUrl && (
          <img src={imageUrl} alt="Preview" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "8px", marginBottom: "12px" }} />
        )}
        <div className="field">
          <label>Style</label>
          <select value={style} onChange={e => setStyle(e.target.value)}>
            {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button type="button" className="btn-vox btn-vox-primary" disabled={analyzing || !imageUrl.trim()} onClick={() => void analyze()}>
          {analyzing ? "Analyzing..." : "Analyze Face"} <span className="arrow">&gt;</span>
        </button>
      </div>

      <div className="panel panel-large">
        <h2>Enhancement Results</h2>
        {!result ? (
          <p className="lede">Analysis results will appear here.</p>
        ) : (
          <>
            <p className="lede">Est. processing time: <strong>{result.estimated_time_seconds}s</strong></p>

            <h3 style={{ fontSize: "13px", marginTop: "16px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Recommended Enhancements</h3>
            <div style={{ display: "grid", gap: "8px" }}>
              {result.enhancements.map((e, i) => (
                <div key={i} style={{ padding: "12px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "13px", textTransform: "capitalize" }}>{e.type.replace(/_/g, " ")}</strong>
                    <span style={{
                      fontSize: "10px", textTransform: "uppercase", padding: "2px 6px", borderRadius: "3px",
                      background: e.priority === "essential" ? "rgba(236,0,47,0.15)" : e.priority === "recommended" ? "rgba(46,204,113,0.15)" : "rgba(100,100,100,0.15)",
                      color: e.priority === "essential" ? "var(--accent)" : e.priority === "recommended" ? "#2ecc71" : "#888",
                    }}>{e.priority}</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--fg-muted)" }}>{e.description}</p>
                  <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--fg-muted)" }}>
                    Intensity: <meter value={e.intensity} min={0} max={1} style={{ marginLeft: "4px", height: "8px" }} /> {(e.intensity * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: "13px", marginTop: "16px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Processing Parameters</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {Object.entries(result.processing_parameters).map(([key, val]) => (
                <div key={key} style={{ padding: "8px 12px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "12px" }}>
                  <span style={{ color: "var(--fg-muted)" }}>{key.replace(/_/g, " ")}: </span>
                  <strong>{String(val)}</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
