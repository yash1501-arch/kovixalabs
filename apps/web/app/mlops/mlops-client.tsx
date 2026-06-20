"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type MlopsModel = {
  id: string;
  workspaceId: string;
  name: string;
  version: string;
  stage: string;
  baseModel: string;
  accuracy: number;
  inferenceLatencyMs: number;
  requestsPerDay: number;
  errorRate: number;
  brandId: string | null;
  lastDeployedAt: string | null;
  createdAt: string;
};

type Experiment = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: string;
  modelCount: number;
  bestAccuracy: number | null;
  bestLatencyMs: number | null;
  metric: string;
  createdAt: string;
  updatedAt: string;
};

const STAGE_ORDER: string[] = ["development", "staging", "production", "archived"];

const STAGE_COLORS: Record<string, string> = {
  production: "#10B981",
  staging: "#F59E0B",
  development: "#3B82F6",
  archived: "#6B7280"
};

const EXPERIMENT_STATUS_COLORS: Record<string, string> = {
  running: "#3B82F6",
  completed: "#10B981",
  archived: "#6B7280",
  failed: "var(--accent)"
};

function StagePill({ stage }: { stage: string }) {
  const color = STAGE_COLORS[stage] ?? "#6B7280";
  return (
    <span style={{
      fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
      letterSpacing: "0.05em", padding: "2px 10px",
      background: `${color}18`, color, border: `1px solid ${color}40`,
      borderRadius: "2px"
    }}>{stage}</span>
  );
}

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

const defaultExpForm = { name: "", description: "", metric: "accuracy" };

export function MlopsClient() {
  const [mlopsModels, setMlopsModels] = useState<MlopsModel[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [showExpForm, setShowExpForm] = useState(false);
  const [expForm, setExpForm] = useState(defaultExpForm);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  const loadData = useCallback(async () => {
    try {
      const [modelsRes, experimentsRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/mlops/models`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/mlops/experiments`))
      ]);
      if (modelsRes.ok) setMlopsModels(await modelsRes.json());
      if (experimentsRes.ok) setExperiments(await experimentsRes.json());
    } catch { /* silently fail */ }
  }, [workspaceId]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function promoteModel(model: MlopsModel) {
    const currentIdx = STAGE_ORDER.indexOf(model.stage);
    const nextStage = STAGE_ORDER[currentIdx + 1];
    if (!nextStage) return;
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/mlops/models/${model.id}/promote`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stage: nextStage })
      });
      if (res.ok) {
        const updated: MlopsModel = await res.json();
        setMlopsModels(prev => prev.map(m => m.id === updated.id ? updated : m));
        setStatus(`Model promoted to ${nextStage}.`);
      }
    } catch { /* silently fail */ }
  }

  async function createExperiment() {
    if (!expForm.name) { setStatus("Experiment name is required."); return; }
    setSaving(true);
    setStatus("Creating experiment...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/mlops/experiments`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(expForm)
      });
      if (!res.ok) throw new Error("API error");
      const exp: Experiment = await res.json();
      setExperiments(prev => [exp, ...prev]);
      setShowExpForm(false);
      setExpForm(defaultExpForm);
      setStatus("Experiment created.");
    } catch { setStatus("Failed to create experiment."); }
    finally { setSaving(false); }
  }

  const totalModels = mlopsModels.length;
  const inProduction = mlopsModels.filter(m => m.stage === "production").length;
  const avgLatency = mlopsModels.length > 0
    ? (mlopsModels.reduce((s, m) => s + m.inferenceLatencyMs, 0) / mlopsModels.length).toFixed(0)
    : "—";
  const avgErrorRate = mlopsModels.length > 0
    ? (mlopsModels.reduce((s, m) => s + m.errorRate, 0) / mlopsModels.length * 100).toFixed(2)
    : "—";

  return (
    <>
      {status && (
        <div style={{ marginBottom: "20px", padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontFamily: "var(--font-heading)", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>
          {status}
        </div>
      )}

      {/* Stats row */}
      <div className="metric-row" style={{ marginBottom: "24px" }}>
        <div className="metric"><span>Total Models</span><strong>{totalModels}</strong></div>
        <div className="metric"><span>In Production</span><strong style={{ color: "#10B981" }}>{inProduction}</strong></div>
        <div className="metric"><span>Avg Latency (ms)</span><strong>{avgLatency}</strong></div>
        <div className="metric"><span>System Error Rate (%)</span><strong style={{ color: "var(--accent)" }}>{avgErrorRate}</strong></div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "20px", alignItems: "start" }}>
        {/* Left: Model Registry */}
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Model Registry</h2>
          {mlopsModels.length === 0 ? (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg-muted)", fontStyle: "italic" }}>No models registered yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-heading)", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Model", "Version", "Stage", "Base Model", "Accuracy", "Latency", "Req/Day", "Error %", ""].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mlopsModels.map(model => {
                    const currentIdx = STAGE_ORDER.indexOf(model.stage);
                    const nextStage = STAGE_ORDER[currentIdx + 1];
                    return (
                      <tr key={model.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px", color: "var(--fg)", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" }}>{model.name}</td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", padding: "2px 8px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}>v{model.version}</span>
                        </td>
                        <td style={{ padding: "10px" }}><StagePill stage={model.stage} /></td>
                        <td style={{ padding: "10px", color: "var(--fg-muted)", fontSize: "11px", whiteSpace: "nowrap" }}>{model.baseModel}</td>
                        <td style={{ padding: "10px", color: "#10B981", fontWeight: 700 }}>{(model.accuracy * 100).toFixed(1)}%</td>
                        <td style={{ padding: "10px", color: "var(--fg)" }}>{model.inferenceLatencyMs}ms</td>
                        <td style={{ padding: "10px", color: "var(--fg)" }}>{model.requestsPerDay.toLocaleString()}</td>
                        <td style={{ padding: "10px", color: model.errorRate > 0.05 ? "var(--accent)" : "var(--fg)" }}>{(model.errorRate * 100).toFixed(2)}%</td>
                        <td style={{ padding: "10px" }}>
                          {nextStage && (
                            <button
                              type="button"
                              className="btn-vox btn-vox-secondary"
                              style={{ fontSize: "10px", padding: "4px 10px", whiteSpace: "nowrap" }}
                              onClick={() => void promoteModel(model)}
                            >Promote &rarr; {nextStage}</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Experiments */}
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Experiments</h2>
            <button type="button" className="btn-vox btn-vox-primary" style={{ fontSize: "11px", padding: "5px 12px" }} onClick={() => setShowExpForm(f => !f)}>
              {showExpForm ? "Cancel" : "+ New"}
            </button>
          </div>

          {showExpForm && (
            <div style={{ marginBottom: "16px", padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="field">
                  <label>Name</label>
                  <input type="text" value={expForm.name} onChange={e => setExpForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Accuracy Sweep v1" />
                </div>
                <div className="field">
                  <label>Description</label>
                  <input type="text" value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
                </div>
                <div className="field">
                  <label>Primary Metric</label>
                  <select value={expForm.metric} onChange={e => setExpForm(f => ({ ...f, metric: e.target.value }))}>
                    <option value="accuracy">Accuracy</option>
                    <option value="latency">Latency</option>
                    <option value="f1_score">F1 Score</option>
                    <option value="loss">Loss</option>
                  </select>
                </div>
                <button type="button" className="btn-vox btn-vox-primary" disabled={saving} style={{ fontSize: "12px" }} onClick={() => void createExperiment()}>
                  {saving ? "Creating..." : "Create"} <span className="arrow">-&gt;</span>
                </button>
              </div>
            </div>
          )}

          {experiments.length === 0 ? (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg-muted)", fontStyle: "italic" }}>No experiments yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {experiments.map(exp => (
                <div key={exp.id} style={{ padding: "12px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "13px", fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.02em" }}>{exp.name}</div>
                    <StatusBadge status={exp.status} colors={EXPERIMENT_STATUS_COLORS} />
                  </div>
                  {exp.description && (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--fg-muted)", margin: "0 0 8px", fontStyle: "italic" }}>{exp.description}</p>
                  )}
                  <div style={{ display: "flex", gap: "16px" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "13px", fontWeight: 700, color: "var(--fg)" }}>{exp.modelCount}</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Models</div>
                    </div>
                    {exp.bestAccuracy !== null && (
                      <div>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "13px", fontWeight: 700, color: "#10B981" }}>{(exp.bestAccuracy * 100).toFixed(1)}%</div>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Best Acc.</div>
                      </div>
                    )}
                    {exp.bestLatencyMs !== null && (
                      <div>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "13px", fontWeight: 700, color: "var(--fg)" }}>{exp.bestLatencyMs}ms</div>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Best Lat.</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "13px", fontWeight: 700, color: "var(--fg-muted)" }}>{exp.metric}</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Metric</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
