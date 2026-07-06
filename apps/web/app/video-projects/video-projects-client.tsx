"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Brand = { id: string; name: string };
type Project = {
  id: string;
  brandId: string;
  title: string;
  description: string | null;
  style: string | null;
  duration: number | null;
  resolution: string | null;
  platform: string | null;
  status: string;
  script: string | null;
  scenes: unknown[] | null;
  renderedUrl: string | null;
  thumbnailUrl: string | null;
  hashtags: string[];
  createdAt: string;
  completedAt: string | null;
};

const initialForm = { brandId: "", title: "", description: "", style: "educational", duration: 30, platform: "tiktok", resolution: "1080x1920" };

export function VideoProjectsClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState(initialForm);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  async function loadData() {
    try {
      const [brandsRes, projRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/video-projects`)),
      ]);
      if (brandsRes.ok) setBrands(await brandsRes.json());
      if (projRes.ok) setProjects(await projRes.json());
    } catch { setStatus("Failed to load data"); }
  }

  useEffect(() => { void loadData(); }, []);

  async function createProject() {
    setCreating(true);
    setStatus("Creating video project...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/video-projects`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("Video project created!");
      setForm(initialForm);
      await loadData();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  async function generateScript(projectId: string) {
    setGenerating(projectId);
    setStatus("Generating AI script...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/video-projects/${projectId}/generate-script`), {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStatus(`Script generated: "${data.title}" with ${data.scenes.length} scenes.`);
      await loadData();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Script generation failed");
    } finally {
      setGenerating(null);
    }
  }

  const statusColor = (s: string) => {
    const map: Record<string, string> = { PENDING: "status-draft", PROCESSING: "status-scheduled", COMPLETED: "status-published", FAILED: "status-failed" };
    return map[s] ?? "status-draft";
  };

  return (
    <section className="dashboard-grid" aria-label="Video projects">
      <div className="panel panel-medium">
        <h2>New Project</h2>
        <form className="studio-form" onSubmit={(e) => { e.preventDefault(); void createProject(); }}>
          <div className="field">
            <label>Brand</label>
            <select value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })} required>
              <option value="">Select brand</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Video title" required />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Project description" rows={3} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="field">
              <label>Platform</label>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram Reels</option>
                <option value="youtube">YouTube</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>
            <div className="field">
              <label>Style</label>
              <select value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })}>
                <option value="educational">Educational</option>
                <option value="entertaining">Entertaining</option>
                <option value="promotional">Promotional</option>
                <option value="storytelling">Storytelling</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="field">
              <label>Duration (seconds)</label>
              <input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} min={15} max={300} />
            </div>
            <div className="field">
              <label>Resolution</label>
              <select value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })}>
                <option value="1080x1920">1080x1920 (Portrait)</option>
                <option value="1920x1080">1920x1080 (Landscape)</option>
                <option value="1080x1080">1080x1080 (Square)</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-vox btn-vox-primary" disabled={creating}>
            {creating ? "Creating..." : "Create Project"} <span className="arrow">-&gt;</span>
          </button>
        </form>
        {status && <p className="lede" style={{ marginTop: "12px" }}>{status}</p>}
      </div>

      <div className="panel panel-large">
        <h2>Projects</h2>
        {projects.length === 0 ? (
          <p className="lede">No video projects yet. Create one to get started.</p>
        ) : (
          <div className="result-grid">
            {projects.map((p) => (
              <article key={p.id} className="result-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <strong>{p.title}</strong>
                  <span className={`post-status ${statusColor(p.status)}`}>{p.status}</span>
                </div>
                {p.description && <p className="lede" style={{ fontSize: "13px" }}>{p.description}</p>}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "12px", color: "var(--fg-muted)", marginTop: "8px" }}>
                  {p.platform && <span>{p.platform}</span>}
                  {p.duration && <span>{p.duration}s</span>}
                  {p.resolution && <span>{p.resolution}</span>}
                  {p.style && <span>{p.style}</span>}
                  {p.scenes && <span>{Array.isArray(p.scenes) ? p.scenes.length : 0} scenes</span>}
                </div>
                <div style={{ marginTop: "8px", display: "flex", gap: "6px" }}>
                  {(!p.scenes || (Array.isArray(p.scenes) && p.scenes.length === 0)) && (
                    <button className="btn-vox btn-vox-secondary" style={{ fontSize: "11px", padding: "4px 10px" }} disabled={generating === p.id} onClick={() => void generateScript(p.id)}>
                      {generating === p.id ? "Generating..." : "Generate AI Script"}
                    </button>
                  )}
                </div>
                {p.renderedUrl && (
                  <video src={p.renderedUrl} controls style={{ width: "100%", borderRadius: "8px", marginTop: "8px" }} />
                )}
                <small style={{ color: "var(--fg-muted)", marginTop: "8px", display: "block" }}>
                  {new Date(p.createdAt).toLocaleString()}
                </small>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
