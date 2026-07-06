"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Brand = { id: string; name: string };
type Job = {
  id: string;
  sourceImageUrl: string;
  targetImageUrl: string;
  resultUrl: string | null;
  status: string;
  error: string | null;
  parameters: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
};

export function FaceSwapClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState({ brandId: "", sourceImageUrl: "", targetImageUrl: "" });
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  async function loadData() {
    try {
      const [brandsRes, jobsRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/face-swap-jobs`)),
      ]);
      if (brandsRes.ok) setBrands(await brandsRes.json());
      if (jobsRes.ok) setJobs(await jobsRes.json());
    } catch {
      setStatus("Failed to load data");
    }
  }

  useEffect(() => { void loadData(); }, []);

  async function createJob() {
    setCreating(true);
    setStatus("Creating face swap job (AI analyzing images)...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/face-swap-jobs`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("Face swap job created and analyzed!");
      setForm({ brandId: form.brandId, sourceImageUrl: "", targetImageUrl: "" });
      await loadData();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to create job");
    } finally {
      setCreating(false);
    }
  }

  function renderAnalysis(job: Job) {
    if (!job.parameters) return null;
    const ai = job.parameters.aiAnalysis as Record<string, unknown> | undefined;
    if (!ai) return null;
    const items: React.ReactNode[] = [];
    if (ai.source_face_detected !== undefined) items.push(<div key="detected">Face detected: {String(ai.source_face_detected)}</div>);
    if (ai.confidence !== undefined) items.push(<div key="confidence">Confidence: {String(ai.confidence)}</div>);
    if (Array.isArray(ai.recommendations)) {
      const tips = (ai.recommendations as string[]).slice(0, 2).join(", ");
      items.push(<div key="tips">Tips: {tips}</div>);
    }
    return <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--fg-muted)" }}>{items}</div>;
  }

  return (
    <section className="dashboard-grid" aria-label="Face swap">
      <div className="panel panel-medium">
        <h2>New Face Swap</h2>
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
            <input value={form.sourceImageUrl} onChange={(e) => setForm({ ...form, sourceImageUrl: e.target.value })} placeholder="https://example.com/face.jpg" required />
          </div>
          <div className="field">
            <label>Target Image URL</label>
            <input value={form.targetImageUrl} onChange={(e) => setForm({ ...form, targetImageUrl: e.target.value })} placeholder="https://example.com/target.jpg" required />
          </div>
          <button type="submit" className="btn-vox btn-vox-primary" disabled={creating}>
            {creating ? "Analyzing..." : "Create Face Swap"} <span className="arrow">-&gt;</span>
          </button>
        </form>
        {status && <p className="lede" style={{ marginTop: "12px" }}>{status}</p>}
      </div>

      <div className="panel panel-large">
        <h2>Face Swap Jobs</h2>
        {jobs.length === 0 ? (
          <p className="lede">No face swap jobs yet.</p>
        ) : (
          <div className="result-grid">
            {jobs.map((job) => (
              <article key={job.id} className="result-card">
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <strong>Status:</strong> <span className={`post-status status-${job.status.toLowerCase()}`}>{job.status}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", overflow: "hidden" }}>
                  <div>
                    <small>Source</small>
                    <img src={job.sourceImageUrl} alt="Source" style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px" }} />
                  </div>
                  <div>
                    <small>Target</small>
                    <img src={job.targetImageUrl} alt="Target" style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px" }} />
                  </div>
                  {job.resultUrl && (
                    <div>
                      <small>Result</small>
                      <img src={job.resultUrl} alt="Result" style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px", border: "2px solid var(--accent)" }} />
                    </div>
                  )}
                </div>
                {renderAnalysis(job)}
                {job.error && <p className="lede" style={{ color: "var(--danger)", marginTop: "8px" }}>{job.error}</p>}
                <small style={{ color: "var(--fg-muted)", marginTop: "8px", display: "block" }}>
                  Created: {new Date(job.createdAt).toLocaleString()}
                </small>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
