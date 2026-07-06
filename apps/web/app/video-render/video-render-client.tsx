"use client";

import { useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Scene = {
  scene_number: number;
  duration_seconds: number;
  visual_description: string;
  spoken_text: string;
  on_screen_text: string;
};

export function VideoRenderClient() {
  const [title, setTitle] = useState("");
  const [cta, setCta] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([
    { scene_number: 1, duration_seconds: 5, visual_description: "", spoken_text: "", on_screen_text: "" },
  ]);
  const [rendering, setRendering] = useState(false);
  const [result, setResult] = useState<{ task_id: string; status: string; video_url: string; error?: string } | null>(null);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  function addScene() {
    setScenes([...scenes, { scene_number: scenes.length + 1, duration_seconds: 5, visual_description: "", spoken_text: "", on_screen_text: "" }]);
  }

  function removeScene(idx: number) {
    setScenes(scenes.filter((_, i) => i !== idx).map((s, i): Scene => ({ ...s, scene_number: i + 1 })));
  }

  function updateScene(idx: number, field: keyof Scene, value: string | number) {
    const updated: Scene[] = scenes.map(s => ({ ...s }));
    (updated[idx] as any)[field] = value;
    setScenes(updated);
  }

  async function render() {
    if (!title.trim()) { setStatus("Enter a video title."); return; }
    setRendering(true);
    setStatus("Rendering video...");
    setResult(null);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/generate/render`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, scenes, cta, hashtags: hashtags.split(",").map(h => h.trim()).filter(Boolean) }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setResult(data);
      setStatus(data.status === "plan_generated" ? "Render plan generated (FFmpeg not available on server)." : "Video rendered!");
    } catch { setStatus("Render failed. Check server configuration."); }
    finally { setRendering(false); }
  }

  return (
    <section className="dashboard-grid">
      <div className="panel panel-large">
        <h2>Video Render</h2>
        {status && <div style={{ padding: "12px 16px", marginBottom: "16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "13px", color: "var(--accent)" }}>{status}</div>}

        <div className="field">
          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="My Video" />
        </div>

        <div style={{ display: "grid", gap: "16px", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "14px", margin: 0 }}>Scenes</h3>
          {scenes.map((scene, i) => (
            <div key={i} style={{ padding: "12px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong>Scene {scene.scene_number}</strong>
                {scenes.length > 1 && <button type="button" className="btn-vox" style={{ fontSize: "12px", padding: "4px 8px" }} onClick={() => removeScene(i)}>Remove</button>}
              </div>
              <div className="field">
                <label>Duration (s)</label>
                <input type="number" min={1} max={60} value={scene.duration_seconds} onChange={e => updateScene(i, "duration_seconds", Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Visual Description</label>
                <textarea value={scene.visual_description} onChange={e => updateScene(i, "visual_description", e.target.value)} placeholder="Describe the visual for this scene..." style={{ minHeight: "60px" }} />
              </div>
              <div className="field">
                <label>Spoken Text</label>
                <textarea value={scene.spoken_text} onChange={e => updateScene(i, "spoken_text", e.target.value)} placeholder="Narration / spoken text..." style={{ minHeight: "60px" }} />
              </div>
              <div className="field">
                <label>On-screen Text</label>
                <input value={scene.on_screen_text} onChange={e => updateScene(i, "on_screen_text", e.target.value)} placeholder="Text overlay (optional)" />
              </div>
            </div>
          ))}
          <button type="button" className="btn-vox" onClick={addScene}>+ Add Scene</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div className="field">
            <label>CTA</label>
            <input value={cta} onChange={e => setCta(e.target.value)} placeholder="Call to action (optional)" />
          </div>
          <div className="field">
            <label>Hashtags (comma separated)</label>
            <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="tag1, tag2" />
          </div>
        </div>

        <button type="button" className="btn-vox btn-vox-primary" disabled={rendering || !title.trim()} onClick={() => void render()}>
          {rendering ? "Rendering..." : "Render Video"} <span className="arrow">&gt;</span>
        </button>

        {result && (
          <div style={{ marginTop: "16px", padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <p className="lede">Status: <strong>{result.status}</strong> | Task: {result.task_id.slice(0, 8)}...</p>
            {result.error && <p style={{ color: "var(--accent)", fontSize: "13px" }}>{result.error}</p>}
            {result.video_url && result.status === "plan_generated" ? (
              <pre style={{ fontSize: "12px", maxHeight: "300px", overflow: "auto", whiteSpace: "pre-wrap", marginTop: "8px" }}>{(() => { try { return JSON.stringify(JSON.parse(result.video_url), null, 2); } catch { return result.video_url; } })()}</pre>
            ) : result.video_url && !result.error ? (
              <video controls src={result.video_url} style={{ width: "100%", marginTop: "8px", maxHeight: "400px" }} />
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
