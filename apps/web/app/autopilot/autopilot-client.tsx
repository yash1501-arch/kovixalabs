"use client";

import { useEffect, useState, useCallback } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type AutopilotConfig = {
  id: string;
  workspaceId: string;
  brandId: string;
  enabled: boolean;
  platforms: string[];
  postsPerWeek: number;
  preferredTimes: string[];
  contentStyle: string;
  topicPreferences: string[];
  lastRanAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AutopilotRun = {
  id: string;
  brandId: string;
  configId: string;
  status: string;
  postsGenerated: number;
  postsScheduled: number;
  platforms: string[];
  summary: string;
  createdAt: string;
};

type Brand = { id: string; name: string };

const PLATFORMS = ["instagram", "linkedin", "x", "facebook", "tiktok", "youtube"];

const CONTENT_STYLES = [
  { value: "educational", label: "Educational" },
  { value: "entertaining", label: "Entertaining" },
  { value: "promotional", label: "Promotional" },
  { value: "mixed", label: "Mixed" }
];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  linkedin: "#0A66C2",
  x: "#1DA1F2",
  facebook: "#1877F2",
  tiktok: "#010101",
  youtube: "#FF0000"
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

const defaultForm = {
  brandId: "",
  platforms: ["instagram"] as string[],
  postsPerWeek: 5,
  contentStyle: "mixed",
  topicPreferences: ""
};

export function AutopilotClient() {
  const [configs, setConfigs] = useState<AutopilotConfig[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<AutopilotConfig | null>(null);
  const [runs, setRuns] = useState<AutopilotRun[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<AutopilotRun | null>(null);
  const [form, setForm] = useState(defaultForm);
  const workspaceId = getWorkspaceId();

  const loadData = useCallback(async () => {
    try {
      const [configsRes, brandsRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/autopilot`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`))
      ]);
      if (configsRes.ok) setConfigs(await configsRes.json());
      if (brandsRes.ok) {
        const b: Brand[] = await brandsRes.json();
        setBrands(b);
        const first = b[0];
        if (first) setForm(f => ({ ...f, brandId: first.id }));
      }
    } catch { /* silently fail */ }
  }, [workspaceId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const loadRuns = useCallback(async (configId: string) => {
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/autopilot/${configId}/runs`));
      if (res.ok) setRuns(await res.json());
    } catch { /* silently fail */ }
  }, [workspaceId]);

  function selectConfig(config: AutopilotConfig) {
    setSelectedConfig(config);
    setShowForm(false);
    setRunResult(null);
    void loadRuns(config.id);
  }

  function openAddForm() {
    setSelectedConfig(null);
    setShowForm(true);
    setRuns([]);
    setRunResult(null);
    setForm(f => ({ ...f, platforms: ["instagram"], postsPerWeek: 5, contentStyle: "mixed", topicPreferences: "" }));
  }

  function openEditForm(config: AutopilotConfig) {
    setShowForm(true);
    setForm({
      brandId: config.brandId,
      platforms: config.platforms,
      postsPerWeek: config.postsPerWeek,
      contentStyle: config.contentStyle,
      topicPreferences: config.topicPreferences.join(", ")
    });
  }

  function togglePlatform(platform: string) {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(platform)
        ? f.platforms.filter(p => p !== platform)
        : [...f.platforms, platform]
    }));
  }

  async function saveConfig() {
    if (!form.brandId) return;
    setSaving(true);
    try {
      const payload = {
        brandId: form.brandId,
        platforms: form.platforms,
        postsPerWeek: Number(form.postsPerWeek),
        contentStyle: form.contentStyle,
        topicPreferences: form.topicPreferences.split(",").map(t => t.trim()).filter(Boolean)
      };
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/autopilot`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const config: AutopilotConfig = await res.json();
        setConfigs(prev => {
          const exists = prev.find(c => c.id === config.id);
          if (exists) return prev.map(c => c.id === config.id ? config : c);
          return [config, ...prev];
        });
        setSelectedConfig(config);
        setShowForm(false);
        void loadRuns(config.id);
      }
    } catch { /* silently fail */ }
    finally { setSaving(false); }
  }

  async function toggleEnabled(config: AutopilotConfig) {
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/autopilot/${config.id}`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !config.enabled })
      });
      if (res.ok) {
        const updated: AutopilotConfig = await res.json();
        setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c));
        if (selectedConfig?.id === updated.id) setSelectedConfig(updated);
      }
    } catch { /* silently fail */ }
  }

  async function runNow(configId: string) {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/autopilot/${configId}/run`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const run: AutopilotRun = await res.json();
        setRunResult(run);
        setRuns(prev => [run, ...prev]);
      }
    } catch { /* silently fail */ }
    finally { setRunning(false); }
  }

  const brandName = (id: string) => brands.find(b => b.id === id)?.name ?? id;

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <p className="eyebrow">Autonomous Posting</p>
          <h1 className="topbar-title">Autopilot</h1>
          <p className="lede">Set it and forget it</p>
        </div>
      </div>

      {/* Two-column layout */}
      <section className="dashboard-grid">
        {/* Left: Config list */}
        <div className="panel panel-medium" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
            <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Configs</h2>
            <button type="button" className="btn-vox btn-vox-primary" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={openAddForm}>
              + Add Config
            </button>
          </div>

          {configs.length === 0 ? (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg-muted)", fontStyle: "italic" }}>
              No autopilot configs yet. Add your first one.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "8px" }}>
              {configs.map(config => (
                <div
                  key={config.id}
                  onClick={() => selectConfig(config)}
                  style={{
                    padding: "14px", cursor: "pointer",
                    background: selectedConfig?.id === config.id ? "var(--bg-surface)" : "var(--bg-base)",
                    border: "1px solid var(--border)",
                    borderLeft: `3px solid ${selectedConfig?.id === config.id ? "var(--accent)" : "transparent"}`,
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em", color: "var(--fg)" }}>
                      {brandName(config.brandId)}
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); void toggleEnabled(config); }}
                      style={{
                        fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                        letterSpacing: "0.05em", padding: "3px 10px", cursor: "pointer", border: "1px solid",
                        background: config.enabled ? "rgba(16,185,129,0.12)" : "rgba(107,114,128,0.12)",
                        color: config.enabled ? "#10B981" : "#6B7280",
                        borderColor: config.enabled ? "rgba(16,185,129,0.3)" : "rgba(107,114,128,0.3)"
                      }}
                    >
                      {config.enabled ? "ON" : "OFF"}
                    </button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
                    {config.platforms.map(p => (
                      <span key={p} style={{
                        fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase",
                        letterSpacing: "0.05em", padding: "2px 6px",
                        background: `${PLATFORM_COLORS[p] ?? "var(--accent)"}18`,
                        color: PLATFORM_COLORS[p] ?? "var(--accent)",
                        border: `1px solid ${PLATFORM_COLORS[p] ?? "var(--accent)"}40`
                      }}>{p}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg-subtle)" }}>
                      {config.postsPerWeek} posts/week
                    </span>
                    {config.lastRanAt && (
                      <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg-subtle)" }}>
                        Last run: {timeAgo(config.lastRanAt)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Detail or Form */}
        <div className="panel panel-large" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {showForm ? (
            /* Config form */
            <>
              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "14px" }}>
                <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>
                  {selectedConfig ? "Edit Config" : "New Autopilot Config"}
                </h2>
              </div>
              <div style={{ display: "grid", gap: "16px" }}>
                <div className="field">
                  <label>Brand</label>
                  <select value={form.brandId} onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))}>
                    <option value="">Select brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "10px" }}>PLATFORMS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {PLATFORMS.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        style={{
                          fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase",
                          letterSpacing: "0.05em", padding: "6px 14px", cursor: "pointer", border: "1px solid",
                          background: form.platforms.includes(p) ? `${PLATFORM_COLORS[p] ?? "var(--accent)"}18` : "var(--bg-base)",
                          color: form.platforms.includes(p) ? (PLATFORM_COLORS[p] ?? "var(--accent)") : "var(--fg-muted)",
                          borderColor: form.platforms.includes(p) ? `${PLATFORM_COLORS[p] ?? "var(--accent)"}60` : "var(--border)"
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Posts Per Week (1–21)</label>
                  <input
                    type="number"
                    min={1} max={21}
                    value={form.postsPerWeek}
                    onChange={e => setForm(f => ({ ...f, postsPerWeek: Number(e.target.value) }))}
                  />
                </div>
                <div className="field">
                  <label>Content Style</label>
                  <select value={form.contentStyle} onChange={e => setForm(f => ({ ...f, contentStyle: e.target.value }))}>
                    {CONTENT_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Topic Preferences (comma-separated)</label>
                  <input
                    value={form.topicPreferences}
                    onChange={e => setForm(f => ({ ...f, topicPreferences: e.target.value }))}
                    placeholder="e.g. product launches, tutorials, behind the scenes"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    className="btn-vox btn-vox-primary"
                    disabled={saving || !form.brandId}
                    onClick={() => void saveConfig()}
                  >
                    {saving ? "Saving..." : "Save Config"} <span className="arrow">-&gt;</span>
                  </button>
                  <button
                    type="button"
                    className="btn-vox btn-vox-secondary"
                    style={{ marginLeft: "10px" }}
                    onClick={() => { setShowForm(false); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          ) : !selectedConfig ? (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "300px", gap: "16px" }}>
              <p className="lede">Select a config or add a new one to get started.</p>
              <button type="button" className="btn-vox btn-vox-primary" onClick={openAddForm}>
                Add Config <span className="arrow">-&gt;</span>
              </button>
            </div>
          ) : (
            /* Config detail */
            <>
              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 800, textTransform: "uppercase", color: "var(--fg)" }}>
                      {brandName(selectedConfig.brandId)}
                    </div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-muted)", marginTop: "4px" }}>
                      {selectedConfig.contentStyle} · {selectedConfig.postsPerWeek} posts/week
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="btn-vox btn-vox-secondary"
                      style={{ fontSize: "11px", padding: "5px 12px" }}
                      onClick={() => openEditForm(selectedConfig)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-vox btn-vox-primary"
                      style={{ fontSize: "11px", padding: "5px 14px" }}
                      disabled={running}
                      onClick={() => void runNow(selectedConfig.id)}
                    >
                      {running ? "Running..." : "Run Now"} <span className="arrow">-&gt;</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Settings summary */}
              <div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "10px" }}>PLATFORMS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {selectedConfig.platforms.map(p => (
                    <span key={p} style={{
                      fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase",
                      padding: "4px 12px",
                      background: `${PLATFORM_COLORS[p] ?? "var(--accent)"}18`,
                      color: PLATFORM_COLORS[p] ?? "var(--accent)",
                      border: `1px solid ${PLATFORM_COLORS[p] ?? "var(--accent)"}40`
                    }}>{p}</span>
                  ))}
                </div>
              </div>

              {selectedConfig.topicPreferences.length > 0 && (
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "10px" }}>TOPICS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {selectedConfig.topicPreferences.map(t => (
                      <span key={t} style={{
                        fontFamily: "var(--font-heading)", fontSize: "11px", padding: "4px 12px",
                        background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg-muted)"
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Run result */}
              {runResult && (
                <div style={{
                  padding: "14px 16px",
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.3)"
                }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#10B981", marginBottom: "6px" }}>RUN COMPLETED</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg)", fontStyle: "italic", marginBottom: "8px" }}>{runResult.summary}</div>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg-muted)" }}>Generated: <strong style={{ color: "var(--fg)" }}>{runResult.postsGenerated}</strong></span>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg-muted)" }}>Scheduled: <strong style={{ color: "var(--fg)" }}>{runResult.postsScheduled}</strong></span>
                  </div>
                </div>
              )}

              {/* Run history */}
              {runs.length > 0 && (
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "10px" }}>
                    RECENT RUNS
                  </div>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {runs.slice(0, 5).map(run => (
                      <div key={run.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 14px", background: "var(--bg-surface)", border: "1px solid var(--border)"
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--fg)", fontStyle: "italic", marginBottom: "4px" }}>
                            {run.summary}
                          </div>
                          <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)" }}>
                            {run.postsGenerated} generated · {run.postsScheduled} scheduled
                          </div>
                        </div>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--fg-subtle)", marginLeft: "12px", whiteSpace: "nowrap" }}>
                          {timeAgo(run.createdAt)}
                        </div>
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
