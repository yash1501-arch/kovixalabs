"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Brand = { id: string; name: string };
type Job = {
  id: string;
  sourceFaceUrl: string;
  targetVideoUrl: string;
  resultUrl: string | null;
  status: string;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
};

export function VideoFaceSwapClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState({ brandId: "", sourceFaceUrl: "", targetVideoUrl: "" });
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    compatible: boolean;
    confidence: number;
    recommendations: string[];
    parameters: Record<string, unknown>;
    estimated_processing_time_seconds: number;
  } | null>(null);
  const workspaceId = getWorkspaceId();

  async function loadData() {
    try {
      const [brandsRes, jobsRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/video-face-swap-jobs`)),
      ]);
      if (brandsRes.ok) setBrands(await brandsRes.json());
      if (jobsRes.ok) setJobs(await jobsRes.json());
    } catch { setStatus("Failed to load data"); }
  }

  useEffect(() => { void loadData(); }, []);

  async function createJob() {
    setCreating(true);
    setStatus("Creating video face swap job...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/video-face-swap-jobs`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("Video face swap job created!");
      setForm({ brandId: form.brandId, sourceFaceUrl: "", targetVideoUrl: "" });
      await loadData();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to create job");
    } finally {
      setCreating(false);
    }
  }

  async function analyzeCompatibility() {
    if (!form.sourceFaceUrl || !form.targetVideoUrl) { setStatus("Enter both source face and target video URLs."); return; }
    setAnalyzing(true);
    setAnalysis(null);
    setStatus("Analyzing compatibility...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/face-swap/video-analyze`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceFaceUrl: form.sourceFaceUrl, targetVideoUrl: form.targetVideoUrl }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAnalysis(data);
      setStatus(data.compatible ? "Compatible! You can proceed." : "Not compatible — review recommendations.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="dashboard-grid" aria-label="Video face swap">
      <div className="panel panel-medium">
        <h2>New Video Face Swap</h2>
        <form className="studio-form" onSubmit={(e) => { e.preventDefault(); void createJob(); }}>
          <div className="field">
            <label>Brand</label>
            <select value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })} required>
              <option value="">Select brand</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Source Face URL</label>
            <input value={form.sourceFaceUrl} onChange={(e) => setForm({ ...form, sourceFaceUrl: e.target.value })} placeholder="https://example.com/face.jpg" required />
          </div>
          <div className="field">
            <label>Target Video URL</label>
            <input value={form.targetVideoUrl} onChange={(e) => setForm({ ...form, targetVideoUrl: e.target.value })} placeholder="https://example.com/video.mp4" required />
          </div>
          <button type="button" className="btn-vox" disabled={analyzing || !form.sourceFaceUrl || !form.targetVideoUrl} onClick={() => void analyzeCompatibility()} style={{ marginBottom: "8px" }}>
            {analyzing ? "Analyzing..." : "Analyze Compatibility"} <span className="arrow">&gt;</span>
          </button>
          {analysis && (
            <div style={{ marginBottom: "12px", padding: "12px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "13px" }}>Compatible: <strong>{analysis.compatible ? "Yes" : "No"}</strong> ({(analysis.confidence * 100).toFixed(0)}% confidence)</p>
              <p style={{ fontSize: "13px" }}>Est. processing: {analysis.estimated_processing_time_seconds}s</p>
              {analysis.recommendations.length > 0 && (
                <ul style={{ fontSize: "12px", marginTop: "6px", paddingLeft: "16px" }}>
                  {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </div>
          )}
          <button type="submit" className="btn-vox btn-vox-primary" disabled={creating}>
            {creating ? "Creating..." : "Create Job"} <span className="arrow">-&gt;</span>
          </button>
        </form>
        {status && <p className="lede" style={{ marginTop: "12px" }}>{status}</p>}
      </div>

      <div className="panel panel-large">
        <h2>Jobs</h2>
        {jobs.length === 0 ? (
          <p className="lede">No video face swap jobs yet.</p>
        ) : (
          <div className="result-grid">
            {jobs.map((job) => (
              <article key={job.id} className="result-card">
                <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
                  <span className={`post-status status-${job.status.toLowerCase()}`}>{job.status}</span>
                </div>
                <div style={{ display: "flex", gap: "12px", marginBottom: "8px", alignItems: "center" }}>
                  <div>
                    <small>Source Face</small>
                    <img src={job.sourceFaceUrl} alt="Source" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }} />
                  </div>
                  {job.resultUrl ? (
                    <video src={job.resultUrl} controls style={{ width: "160px", borderRadius: "8px" }} />
                  ) : (
                    <p className="lede">Processing...</p>
                  )}
                </div>
                {job.error && <p className="lede" style={{ color: "var(--danger)", marginTop: "8px" }}>{job.error}</p>}
                <small style={{ color: "var(--fg-muted)" }}>Created: {new Date(job.createdAt).toLocaleString()}</small>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
