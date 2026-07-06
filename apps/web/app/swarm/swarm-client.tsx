"use client";

import { useEffect, useState, useCallback } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type AgentRole = "coordinator" | "content" | "trend" | "caption" | "hashtag" | "scheduler" | "publisher";
type AgentStatus = "idle" | "queued" | "running" | "completed" | "failed";

type SwarmAgent = {
  id: string;
  taskId: string;
  role: AgentRole;
  status: AgentStatus;
  progress: number;
  currentAction: string;
  logs: string[];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

type SwarmTask = {
  id: string;
  brandId: string;
  type: string;
  status: string;
  priority: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  agentCount: number;
  completedAgents: number;
  createdAt: string;
  updatedAt: string;
  agents: SwarmAgent[];
};

type Brand = { id: string; name: string };

const TASK_TYPES: Record<string, string> = {
  content_week: "Full Content Week",
  trend_analysis: "Trend Analysis",
  campaign_create: "Campaign Creation",
  brand_audit: "Brand Audit",
  hashtag_refresh: "Hashtag Refresh"
};

const STATUS_COLORS: Record<string, string> = {
  completed: "#10B981",
  running: "#3B82F6",
  failed: "var(--accent)",
  pending: "#6B7280",
  queued: "#6B7280"
};

const AGENT_ROLE_COLORS: Record<AgentRole, string> = {
  coordinator: "var(--accent)",
  content: "#3B82F6",
  trend: "#10B981",
  caption: "#8B5CF6",
  hashtag: "#F59E0B",
  scheduler: "#06B6D4",
  publisher: "#EC4899"
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const defaultForm = { brandId: "", type: "content_week", priority: "normal" };

export function SwarmClient() {
  const [tasks, setTasks] = useState<SwarmTask[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedTask, setSelectedTask] = useState<SwarmTask | null>(null);
  const [showDispatch, setShowDispatch] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const workspaceId = getWorkspaceId();

  const loadData = useCallback(async () => {
    try {
      const [tasksRes, brandsRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/swarm/tasks`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`))
      ]);
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (brandsRes.ok) {
        const b: Brand[] = await brandsRes.json();
        setBrands(b);
        const first = b[0];
        if (first) setForm(f => ({ ...f, brandId: first.id }));
      }
    } catch { /* silently fail */ }
  }, [workspaceId]);

  useEffect(() => { void loadData(); }, [loadData]);

  // Poll for task updates while any task is still processing
  useEffect(() => {
    if (!tasks.some(t => t.status === "processing")) return;
    const interval = setInterval(() => { void loadData(); }, 5000);
    return () => clearInterval(interval);
  }, [tasks, loadData]);

  async function dispatch() {
    if (!form.brandId) return;
    setDispatching(true);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/swarm/dispatch`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: form.type, brandId: form.brandId, priority: form.priority, input: {} })
      });
      if (res.ok) {
        const task: SwarmTask = await res.json();
        setTasks(prev => [task, ...prev]);
        setSelectedTask(task);
        setShowDispatch(false);
      }
    } catch { /* silently fail */ }
    finally { setDispatching(false); }
  }

  const totalAgents = tasks.reduce((s, t) => s + t.agentCount, 0);
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const avgAgents = tasks.length > 0 ? (totalAgents / tasks.length).toFixed(1) : "0";

  const brandName = (id: string) => brands.find(b => b.id === id)?.name ?? id;

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <p className="eyebrow">AI Automation</p>
          <h1 className="topbar-title">Agent Swarm</h1>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="btn-vox btn-vox-primary"
            onClick={() => setShowDispatch(f => !f)}
          >
            {showDispatch ? "Cancel" : "Dispatch Task"} <span className="arrow">-&gt;</span>
          </button>
        </div>
      </div>

      {/* Dispatch form */}
      {showDispatch && (
        <div className="panel" style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Launch Agent Swarm</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
            <div className="field">
              <label>Brand</label>
              <select value={form.brandId} onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))}>
                <option value="">Select brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Task Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {Object.entries(TASK_TYPES).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <button
              type="button"
              className="btn-vox btn-vox-primary"
              disabled={dispatching || !form.brandId}
              onClick={() => void dispatch()}
            >
              {dispatching ? "Launching..." : "Launch Swarm"} <span className="arrow">-&gt;</span>
            </button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="metric-row" style={{ marginBottom: "24px" }}>
        <div className="metric"><span>Total Tasks</span><strong>{tasks.length}</strong></div>
        <div className="metric"><span>Completed</span><strong style={{ color: "#10B981" }}>{completedTasks}</strong></div>
        <div className="metric"><span>Agents Deployed</span><strong style={{ color: "var(--accent)" }}>{totalAgents}</strong></div>
        <div className="metric"><span>Avg Agents/Task</span><strong>{avgAgents}</strong></div>
      </div>

      {/* Two-column layout */}
      <section className="dashboard-grid">
        {/* Left: Task list */}
        <div className="panel panel-medium" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
            <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Tasks</h2>
          </div>

          {tasks.length === 0 ? (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg-muted)", fontStyle: "italic" }}>
              No swarm tasks yet. Dispatch your first task.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "8px", overflowY: "auto" }}>
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  style={{
                    padding: "14px", cursor: "pointer",
                    background: selectedTask?.id === task.id ? "var(--bg-surface)" : "var(--bg-base)",
                    border: "1px solid var(--border)",
                    borderLeft: `3px solid ${selectedTask?.id === task.id ? "var(--accent)" : "transparent"}`,
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em", color: "var(--fg)" }}>
                      {TASK_TYPES[task.type] ?? task.type}
                    </div>
                    <span style={{
                      fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                      letterSpacing: "0.05em", padding: "2px 8px",
                      background: `${STATUS_COLORS[task.status] ?? "#6B7280"}18`,
                      color: STATUS_COLORS[task.status] ?? "#6B7280",
                      border: `1px solid ${STATUS_COLORS[task.status] ?? "#6B7280"}40`
                    }}>{task.status}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
                    {brandName(task.brandId)}
                  </div>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg-subtle)" }}>
                      {task.completedAgents}/{task.agentCount} agents
                    </span>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg-subtle)" }}>
                      {timeAgo(task.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Task detail */}
        <div className="panel panel-large" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {!selectedTask ? (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "300px", gap: "16px" }}>
              <p className="lede">Select a task to view agent activity and output.</p>
              <button type="button" className="btn-vox btn-vox-primary" onClick={() => setShowDispatch(true)}>
                Dispatch Task <span className="arrow">-&gt;</span>
              </button>
            </div>
          ) : (
            <>
              {/* Task header */}
              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em", color: "var(--fg)", flex: 1 }}>
                    {TASK_TYPES[selectedTask.type] ?? selectedTask.type}
                  </div>
                  <span style={{
                    fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                    padding: "3px 10px",
                    background: selectedTask.priority === "high" ? "rgba(236,0,47,0.12)" : selectedTask.priority === "normal" ? "rgba(59,130,246,0.12)" : "rgba(107,114,128,0.12)",
                    color: selectedTask.priority === "high" ? "var(--accent)" : selectedTask.priority === "normal" ? "#3B82F6" : "#6B7280",
                    border: `1px solid ${selectedTask.priority === "high" ? "rgba(236,0,47,0.3)" : selectedTask.priority === "normal" ? "rgba(59,130,246,0.3)" : "rgba(107,114,128,0.3)"}`
                  }}>{selectedTask.priority}</span>
                  <span style={{
                    fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                    padding: "3px 10px",
                    background: `${STATUS_COLORS[selectedTask.status] ?? "#6B7280"}18`,
                    color: STATUS_COLORS[selectedTask.status] ?? "#6B7280",
                    border: `1px solid ${STATUS_COLORS[selectedTask.status] ?? "#6B7280"}40`
                  }}>{selectedTask.status}</span>
                </div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg-muted)", textTransform: "uppercase", marginTop: "8px" }}>
                  {brandName(selectedTask.brandId)} · {selectedTask.completedAgents}/{selectedTask.agentCount} agents completed
                </div>
              </div>

              {/* Output section */}
              {selectedTask.output && Object.keys(selectedTask.output).length > 0 && (
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "10px" }}>OUTPUT</div>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {Object.entries(selectedTask.output).map(([key, value]) => (
                      <div key={key} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                        padding: "10px 14px", background: "var(--bg-surface)", border: "1px solid var(--border)"
                      }}>
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-muted)" }}>{key}</span>
                        <span style={{
                          fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg)", textAlign: "right", maxWidth: "60%",
                          fontStyle: typeof value === "string" ? "italic" : "normal",
                          fontWeight: typeof value === "number" ? 700 : 400
                        }}>
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agents section */}
              {selectedTask.agents && selectedTask.agents.length > 0 && (
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "12px" }}>
                    AGENTS ({selectedTask.agents.length})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
                    {selectedTask.agents.map(agent => (
                      <div key={agent.id} style={{
                        padding: "16px", background: "var(--bg-surface)", border: "1px solid var(--border)",
                        borderTop: `3px solid ${AGENT_ROLE_COLORS[agent.role] ?? "var(--accent)"}`,
                        display: "flex", flexDirection: "column", gap: "10px"
                      }}>
                        {/* Role + Status */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{
                            fontFamily: "var(--font-heading)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: "0.06em", color: AGENT_ROLE_COLORS[agent.role] ?? "var(--accent)"
                          }}>{agent.role}</span>
                          <span style={{
                            fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                            padding: "2px 8px",
                            background: `${STATUS_COLORS[agent.status] ?? "#6B7280"}18`,
                            color: STATUS_COLORS[agent.status] ?? "#6B7280",
                            border: `1px solid ${STATUS_COLORS[agent.status] ?? "#6B7280"}40`
                          }}>{agent.status}</span>
                        </div>

                        {/* Current action */}
                        {agent.currentAction && (
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--fg-muted)", fontStyle: "italic", lineHeight: 1.4 }}>
                            {agent.currentAction}
                          </div>
                        )}

                        {/* Progress bar */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)" }}>Progress</span>
                            <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: AGENT_ROLE_COLORS[agent.role] ?? "var(--accent)" }}>{agent.progress}%</span>
                          </div>
                          <div style={{ height: "4px", background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                            <div style={{
                              height: "100%",
                              width: `${agent.progress}%`,
                              background: AGENT_ROLE_COLORS[agent.role] ?? "var(--accent)",
                              transition: "width 0.3s ease"
                            }} />
                          </div>
                        </div>

                        {/* Last log entry */}
                        {agent.logs && agent.logs.length > 0 && (
                          <div style={{
                            fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                            letterSpacing: "0.04em", color: "var(--fg-subtle)",
                            padding: "6px 8px", background: "var(--bg-base)", border: "1px solid var(--border)"
                          }}>
                            {agent.logs[agent.logs.length - 1]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
