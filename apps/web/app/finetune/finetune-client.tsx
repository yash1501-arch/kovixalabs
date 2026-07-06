"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type FinetuneDataset = {
  id: string;
  workspaceId: string;
  brandId: string;
  name: string;
  description: string;
  exampleCount: number;
  fileSizeKb: number;
  status: string;
  createdAt: string;
};

type FinetuneJob = {
  id: string;
  workspaceId: string;
  brandId: string;
  datasetId: string;
  jobName: string;
  baseModel: string;
  status: string;
  progress: number;
  currentEpoch: number;
  totalEpochs: number;
  trainLoss: number | null;
  valLoss: number | null;
  accuracy: number | null;
  estimatedSecondsRemaining: number | null;
  createdAt: string;
  updatedAt: string;
};

type FinetunedModel = {
  id: string;
  workspaceId: string;
  brandId: string;
  jobId: string;
  name: string;
  baseModel: string;
  status: string;
  accuracy: number;
  inferenceLatencyMs: number;
  totalInferences: number;
  deployedAt: string | null;
  createdAt: string;
};

type Brand = { id: string; name: string };

const BASE_MODELS = [
  "aismos-base-v1",
  "aismos-caption-v2",
  "aismos-hashtag-v1",
  "aismos-tone-v3"
];

type LlmModel = {
  id: string;
  name: string;
  provider: string;
  model: string;
  isDefault: boolean;
  enabled: boolean;
};

const JOB_STATUS_COLORS: Record<string, string> = {
  completed: "#10B981",
  running: "#3B82F6",
  failed: "var(--accent)",
  queued: "#F59E0B",
  cancelled: "#6B7280"
};

const MODEL_STATUS_COLORS: Record<string, string> = {
  ready: "#3B82F6",
  deployed: "#10B981",
  training: "#F97316",
  archived: "#6B7280"
};

const DATASET_STATUS_COLORS: Record<string, string> = {
  ready: "#10B981",
  processing: "#3B82F6",
  error: "var(--accent)",
  pending: "#F59E0B"
};

function StatusBadge({ status, colors }: { status: string; colors: Record<string, string> }) {
  const color = colors[status] ?? "#6B7280";
  return (
    <span style={{
      fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
      letterSpacing: "0.05em", padding: "2px 8px",
      background: `${color}18`, color, border: `1px solid ${color}40`
    }}>{status}</span>
  );
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const defaultDatasetForm = { brandId: "", name: "", description: "", exampleCount: 150, fileSizeKb: 0 };
const defaultJobForm = { brandId: "", datasetId: "", jobName: "", baseModel: "aismos-base-v1", totalEpochs: 5 };

export function FinetuneClient() {
  const [tab, setTab] = useState<"datasets" | "jobs" | "models">("datasets");
  const [datasets, setDatasets] = useState<FinetuneDataset[]>([]);
  const [jobs, setJobs] = useState<FinetuneJob[]>([]);
  const [models, setModels] = useState<FinetunedModel[]>([]);
  const [llmModels, setLlmModels] = useState<LlmModel[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showDatasetForm, setShowDatasetForm] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [datasetForm, setDatasetForm] = useState(defaultDatasetForm);
  const [jobForm, setJobForm] = useState(defaultJobForm);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  const loadData = useCallback(async () => {
    try {
      const [datasetsRes, jobsRes, modelsRes, brandsRes, llmRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/finetune/datasets`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/finetune/jobs`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/finetune/models`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/llm-models`)),
      ]);
      if (datasetsRes.ok) setDatasets(await datasetsRes.json());
      if (jobsRes.ok) setJobs(await jobsRes.json());
      if (modelsRes.ok) setModels(await modelsRes.json());
      if (brandsRes.ok) {
        const b: Brand[] = await brandsRes.json();
        setBrands(b);
        const first = b[0];
        if (first) {
          setDatasetForm(f => ({ ...f, brandId: first.id }));
          setJobForm(f => ({ ...f, brandId: first.id }));
        }
      }
      if (llmRes.ok) {
        const m: LlmModel[] = await llmRes.json();
        setLlmModels(m);
        const def = m.find(m => m.isDefault) ?? m[0];
        if (def) {
          setJobForm(f => ({ ...f, baseModel: `${def.provider}/${def.model}` }));
        }
      }
    } catch { /* silently fail */ }
  }, [workspaceId]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function createDataset() {
    if (!datasetForm.brandId || !datasetForm.name) { setStatus("Brand and name are required."); return; }
    setSaving(true);
    setStatus("Creating dataset...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/finetune/datasets`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...datasetForm, exampleCount: Number(datasetForm.exampleCount), fileSizeKb: Number(datasetForm.fileSizeKb) })
      });
      if (!res.ok) throw new Error("API error");
      const d: FinetuneDataset = await res.json();
      setDatasets(prev => [d, ...prev]);
      setShowDatasetForm(false);
      setDatasetForm(defaultDatasetForm);
      setStatus("Dataset created.");
    } catch { setStatus("Failed to create dataset."); }
    finally { setSaving(false); }
  }

  async function deleteDataset(id: string) {
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/finetune/datasets/${id}`), { method: "DELETE" });
      setDatasets(prev => prev.filter(d => d.id !== id));
    } catch { /* silently fail */ }
  }

  async function createJob() {
    if (!jobForm.brandId || !jobForm.datasetId || !jobForm.jobName) { setStatus("Brand, dataset, and job name are required."); return; }
    setSaving(true);
    setStatus("Starting training job...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/finetune/jobs`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...jobForm, totalEpochs: Number(jobForm.totalEpochs) })
      });
      if (!res.ok) throw new Error("API error");
      const j: FinetuneJob = await res.json();
      setJobs(prev => [j, ...prev]);
      setShowJobForm(false);
      setJobForm(defaultJobForm);
      setStatus("Job started. Switching to Models tab...");
      setTimeout(() => setTab("models"), 800);
    } catch { setStatus("Failed to start job."); }
    finally { setSaving(false); }
  }

  async function deployModel(modelId: string) {
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/finetune/models/${modelId}/deploy`), { method: "POST" });
      if (res.ok) {
        const updated: FinetunedModel = await res.json();
        setModels(prev => prev.map(m => m.id === updated.id ? updated : m));
        setStatus("Model deployed.");
      }
    } catch { /* silently fail */ }
  }

  const getBrandName = (id: string) => brands.find(b => b.id === id)?.name ?? id;

  const tabStyle = (t: string): React.CSSProperties => ({
    fontFamily: "var(--font-heading)",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "8px 20px",
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
    color: tab === t ? "var(--fg)" : "var(--fg-muted)",
    transition: "all 0.15s ease"
  });

  return (
    <>
      {status && (
        <div style={{ marginBottom: "20px", padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontFamily: "var(--font-heading)", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>
          {status}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "24px", gap: "0" }}>
        <button type="button" style={tabStyle("datasets")} onClick={() => setTab("datasets")}>Datasets</button>
        <button type="button" style={tabStyle("jobs")} onClick={() => setTab("jobs")}>Jobs</button>
        <button type="button" style={tabStyle("models")} onClick={() => setTab("models")}>Models</button>
      </div>

      {/* DATASETS TAB */}
      {tab === "datasets" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>{datasets.length} datasets</span>
            <button type="button" className="btn-vox btn-vox-primary" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={() => setShowDatasetForm(f => !f)}>
              {showDatasetForm ? "Cancel" : "+ Add Dataset"}
            </button>
          </div>

          {showDatasetForm && (
            <div className="panel" style={{ marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 16px", borderBottom: "none", padding: 0 }}>New Dataset</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
                <div className="field">
                  <label>Brand</label>
                  <select value={datasetForm.brandId} onChange={e => setDatasetForm(f => ({ ...f, brandId: e.target.value }))}>
                    <option value="">Select brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Name</label>
                  <input type="text" value={datasetForm.name} onChange={e => setDatasetForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Brand Voice Q4" />
                </div>
                <div className="field">
                  <label>Example Count</label>
                  <input type="number" min={1} value={datasetForm.exampleCount} onChange={e => setDatasetForm(f => ({ ...f, exampleCount: Number(e.target.value) }))} />
                </div>
                <div className="field">
                  <label>File Size (KB)</label>
                  <input type="number" min={0} value={datasetForm.fileSizeKb} onChange={e => setDatasetForm(f => ({ ...f, fileSizeKb: Number(e.target.value) }))} />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>Description</label>
                  <input type="text" value={datasetForm.description} onChange={e => setDatasetForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description of this dataset" />
                </div>
              </div>
              <div style={{ marginTop: "16px" }}>
                <button type="button" className="btn-vox btn-vox-primary" disabled={saving} onClick={() => void createDataset()}>
                  {saving ? "Creating..." : "Create Dataset"} <span className="arrow">-&gt;</span>
                </button>
              </div>
            </div>
          )}

          {datasets.length === 0 ? (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg-muted)", fontStyle: "italic" }}>No datasets yet. Add your first training dataset.</p>
          ) : (
            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
              {datasets.map(d => (
                <div key={d.id} className="panel" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.02em" }}>{d.name}</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>{getBrandName(d.brandId)}</div>
                    </div>
                    <StatusBadge status={d.status} colors={DATASET_STATUS_COLORS} />
                  </div>
                  {d.description && (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--fg-muted)", margin: 0, fontStyle: "italic" }}>{d.description}</p>
                  )}
                  <div style={{ display: "flex", gap: "20px" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 800, color: "var(--fg)" }}>{d.exampleCount}</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Examples</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 800, color: "var(--fg)" }}>{d.fileSizeKb} KB</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>File Size</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: "var(--fg-subtle)", textTransform: "uppercase" }}>{formatDate(d.createdAt)}</span>
                    <button
                      type="button"
                      onClick={() => void deleteDataset(d.id)}
                      style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
                    >Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* JOBS TAB */}
      {tab === "jobs" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>{jobs.length} jobs</span>
            <button type="button" className="btn-vox btn-vox-primary" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={() => setShowJobForm(f => !f)}>
              {showJobForm ? "Cancel" : "+ New Job"}
            </button>
          </div>

          {showJobForm && (
            <div className="panel" style={{ marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 16px", borderBottom: "none", padding: 0 }}>New Training Job</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
                <div className="field">
                  <label>Brand</label>
                  <select value={jobForm.brandId} onChange={e => setJobForm(f => ({ ...f, brandId: e.target.value }))}>
                    <option value="">Select brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Dataset</label>
                  <select value={jobForm.datasetId} onChange={e => setJobForm(f => ({ ...f, datasetId: e.target.value }))}>
                    <option value="">Select dataset</option>
                    {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Job Name</label>
                  <input type="text" value={jobForm.jobName} onChange={e => setJobForm(f => ({ ...f, jobName: e.target.value }))} placeholder="e.g. brand-voice-run-1" />
                </div>
                <div className="field">
                  <label>Base Model</label>
                  <select value={jobForm.baseModel} onChange={e => setJobForm(f => ({ ...f, baseModel: e.target.value }))}>
                    {llmModels.length > 0
                      ? llmModels.map(m => <option key={m.id} value={`${m.provider}/${m.model}`}>{m.name} ({m.provider}/{m.model}){m.isDefault ? " ★" : ""}</option>)
                      : BASE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Total Epochs (1–20)</label>
                  <input type="number" min={1} max={20} value={jobForm.totalEpochs} onChange={e => setJobForm(f => ({ ...f, totalEpochs: Number(e.target.value) }))} />
                </div>
              </div>
              <div style={{ marginTop: "16px" }}>
                <button type="button" className="btn-vox btn-vox-primary" disabled={saving} onClick={() => void createJob()}>
                  {saving ? "Starting..." : "Start Training"} <span className="arrow">-&gt;</span>
                </button>
              </div>
            </div>
          )}

          {jobs.length === 0 ? (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg-muted)", fontStyle: "italic" }}>No jobs yet. Start your first training job.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {jobs.map(job => (
                <div key={job.id} className="panel">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "15px", fontWeight: 800, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.02em" }}>{job.jobName}</div>
                      <div style={{ marginTop: "4px", display: "flex", gap: "6px", alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", padding: "2px 8px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg-muted)", textTransform: "uppercase" }}>{job.baseModel}</span>
                        <StatusBadge status={job.status} colors={JOB_STATUS_COLORS} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase" }}>Epochs</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 800, color: "var(--fg)" }}>{job.currentEpoch}/{job.totalEpochs}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Progress</span>
                      <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: "var(--fg)" }}>{job.progress}%</span>
                    </div>
                    <div style={{ height: "4px", background: "var(--bg-surface)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${job.progress}%`, background: JOB_STATUS_COLORS[job.status] ?? "var(--accent)", transition: "width 0.3s ease" }} />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: "flex", gap: "20px" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "12px", fontWeight: 700, color: "var(--fg)" }}>{job.trainLoss !== null ? job.trainLoss.toFixed(4) : "—"}</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Train Loss</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "12px", fontWeight: 700, color: "var(--fg)" }}>{job.valLoss !== null ? job.valLoss.toFixed(4) : "—"}</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Val Loss</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "12px", fontWeight: 700, color: job.accuracy !== null ? "#10B981" : "var(--fg)" }}>{job.accuracy !== null ? `${(job.accuracy * 100).toFixed(1)}%` : "—"}</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Accuracy</div>
                    </div>
                    {job.estimatedSecondsRemaining !== null && (
                      <div>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "12px", fontWeight: 700, color: "var(--fg)" }}>{Math.ceil(job.estimatedSecondsRemaining / 60)}m</div>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>ETA</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODELS TAB */}
      {tab === "models" && (
        <div>
          <div style={{ marginBottom: "16px" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>{models.length} fine-tuned models</span>
          </div>

          {models.length === 0 ? (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg-muted)", fontStyle: "italic" }}>No fine-tuned models yet. Complete a training job to see models here.</p>
          ) : (
            <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
              {models.map(model => (
                <div key={model.id} className="panel" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.02em" }}>{model.name}</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>{model.baseModel}</div>
                    </div>
                    <StatusBadge status={model.status} colors={MODEL_STATUS_COLORS} />
                  </div>

                  <div style={{ display: "flex", gap: "20px" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 800, color: "#10B981" }}>{(model.accuracy * 100).toFixed(1)}%</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Accuracy</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 800, color: "var(--fg)" }}>{model.inferenceLatencyMs}ms</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Latency</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 800, color: "var(--fg)" }}>{model.totalInferences.toLocaleString()}</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Inferences</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: "var(--fg-subtle)", textTransform: "uppercase" }}>
                      {model.deployedAt ? `Deployed ${formatDate(model.deployedAt)}` : `Created ${formatDate(model.createdAt)}`}
                    </span>
                    {model.status === "ready" && (
                      <button
                        type="button"
                        className="btn-vox btn-vox-primary"
                        style={{ fontSize: "11px", padding: "5px 12px" }}
                        onClick={() => void deployModel(model.id)}
                      >Deploy</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
