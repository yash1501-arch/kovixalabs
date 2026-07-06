"use client";

import { useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

export function VoiceoverClient() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("nova");
  const [speed, setSpeed] = useState(1.0);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ task_id: string; audio_url: string; duration_seconds: number } | null>(null);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  async function generate() {
    if (!text.trim()) { setStatus("Enter some text first."); return; }
    setGenerating(true);
    setStatus("Generating voiceover...");
    setResult(null);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/generate/voiceover`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, voice, speed }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setResult(data);
      setStatus("Voiceover generated.");
    } catch { setStatus("Generation failed. Check your AI service configuration."); }
    finally { setGenerating(false); }
  }

  return (
    <section className="dashboard-grid">
      <div className="panel panel-medium">
        <h2>Text to Speech</h2>
        {status && <div style={{ padding: "12px 16px", marginBottom: "16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "13px", color: "var(--accent)" }}>{status}</div>}

        <div className="field">
          <label>Text</label>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter the text to convert to speech..." style={{ minHeight: "150px", resize: "vertical" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="field">
            <label>Voice</label>
            <select value={voice} onChange={e => setVoice(e.target.value)}>
              {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Speed ({speed.toFixed(1)}x)</label>
            <input type="range" min={0.5} max={2.0} step={0.1} value={speed} onChange={e => setSpeed(Number(e.target.value))} />
          </div>
        </div>
        <button type="button" className="btn-vox btn-vox-primary" disabled={generating || !text.trim()} onClick={() => void generate()}>
          {generating ? "Generating..." : "Generate Voiceover"} <span className="arrow">&gt;</span>
        </button>

        {result && (
          <div style={{ marginTop: "16px", padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <p className="lede">Duration: {result.duration_seconds.toFixed(1)}s | Task: {result.task_id.slice(0, 8)}...</p>
            <audio controls src={result.audio_url} style={{ width: "100%", marginTop: "8px" }} />
          </div>
        )}
      </div>

      <div className="panel panel-large">
        <h2>Voice Settings</h2>
        <div style={{ display: "grid", gap: "12px" }}>
          {VOICES.map(v => (
            <div key={v} style={{ padding: "12px", background: "var(--bg-surface)", border: "1px solid var(--border)", cursor: "pointer", ...(voice === v ? { borderColor: "var(--accent)", outline: "1px solid var(--accent)" } : {}) }} onClick={() => setVoice(v)}>
              <strong style={{ textTransform: "capitalize" }}>{v}</strong>
              <span style={{ fontSize: "12px", color: "var(--fg-muted)", marginLeft: "8px" }}>
                {v === "alloy" ? "Versatile neutral" : v === "echo" ? "Warm male" : v === "fable" ? "British storytelling" : v === "onyx" ? "Deep authoritative" : v === "nova" ? "Bright female" : "Expressive soft"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
