"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Webhook = {
  id: string;
  url: string;
  events: string[];
  secret: string | null;
  enabled: boolean;
  description: string | null;
  lastTriggeredAt: string | null;
  lastStatus: string | null;
  createdAt: string;
};

const EVENT_OPTIONS = [
  { value: "POST_PUBLISHED", label: "Post Published", color: "#10B981" },
  { value: "POST_SCHEDULED", label: "Post Scheduled", color: "#3B82F6" },
  { value: "POST_FAILED", label: "Post Failed", color: "var(--accent)" },
  { value: "POST_DELETED", label: "Post Deleted", color: "#6B7280" },
  { value: "CAMPAIGN_CREATED", label: "Campaign Created", color: "#8B5CF6" },
  { value: "CAMPAIGN_STATUS_CHANGED", label: "Campaign Status Changed", color: "#F59E0B" },
];

const EVENT_COLORS: Record<string, string> = Object.fromEntries(
  EVENT_OPTIONS.map(e => [e.value, e.color])
);

export function WebhooksClient() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ url: "", events: [] as string[], secret: "", description: "", enabled: true });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; status: number; elapsed_ms: number; error: string | null } | null>(null);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/webhooks`));
      if (res.ok) setWebhooks(await res.json());
    } catch { /* */ }
  }, [workspaceId]);

  useEffect(() => { void loadData(); }, [loadData]);

  function resetForm() {
    setForm({ url: "", events: [], secret: "", description: "", enabled: true });
    setEditingId(null);
    setShowForm(false);
  }

  async function save() {
    if (!form.url.trim() || form.events.length === 0) { setStatus("URL and at least one event required."); return; }
    setSaving(true);
    setStatus("");
    try {
      const body: any = { url: form.url, events: form.events, enabled: form.enabled, description: form.description || undefined };
      if (form.secret) body.secret = form.secret;

      const res = editingId
        ? await fetch(apiUrl(`/v1/workspaces/${workspaceId}/webhooks/${editingId}`), {
            method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
          })
        : await fetch(apiUrl(`/v1/workspaces/${workspaceId}/webhooks`), {
            method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
          });

      if (!res.ok) throw new Error(await res.text());
      setStatus(editingId ? "Webhook updated." : "Webhook created.");
      resetForm();
      await loadData();
    } catch (e: any) {
      setStatus(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(webhookId: string) {
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/webhooks/${webhookId}`), { method: "DELETE" });
      await loadData();
    } catch { setStatus("Delete failed."); }
  }

  async function testWebhook(webhookId: string) {
    setTesting(webhookId);
    setTestResult(null);
    setStatus("Testing...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/webhooks/${webhookId}/test`), { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTestResult(data);
      setStatus(data.success ? `Test sent — ${data.status} in ${data.elapsed_ms}ms` : `Failed — ${data.error}`);
    } catch (e: any) {
      setTestResult({ success: false, status: 0, elapsed_ms: 0, error: e?.message ?? "unknown" });
      setStatus("Test request failed.");
    } finally {
      setTesting(null);
    }
  }

  function startEdit(wh: Webhook) {
    setForm({ url: wh.url, events: wh.events, secret: wh.secret ?? "", description: wh.description ?? "", enabled: wh.enabled });
    setEditingId(wh.id);
    setShowForm(true);
  }

  function toggleEvent(event: string) {
    setForm(f => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
    }));
  }

  return (
    <section className="dashboard-grid">
      <div className="panel panel-medium">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0 }}>{editingId ? "Edit Webhook" : showForm ? "New Webhook" : "Webhooks"}</h2>
          {!showForm && <button type="button" className="btn-vox btn-vox-primary" onClick={() => setShowForm(true)}>+ Add</button>}
        </div>

        {status && <div style={{ padding: "12px 16px", marginBottom: "16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "13px", color: "var(--accent)" }}>{status}</div>}

        {showForm && (
          <div>
            <div className="field">
              <label>URL</label>
              <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://example.com/webhook" />
            </div>
            <div className="field">
              <label>Events</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                {EVENT_OPTIONS.map(ev => (
                  <button key={ev.value} type="button" onClick={() => toggleEvent(ev.value)} style={{
                    fontSize: "11px", padding: "4px 10px", cursor: "pointer",
                    background: form.events.includes(ev.value) ? `${ev.color}28` : "var(--bg-base)",
                    color: form.events.includes(ev.value) ? ev.color : "var(--fg-muted)",
                    border: `1px solid ${form.events.includes(ev.value) ? ev.color : "var(--border)"}`,
                    fontFamily: "var(--font-heading)", textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>{ev.label}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Secret (optional, for signature verification)</label>
              <input value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })} placeholder="webhook_secret" type="password" />
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g., Slack notification" />
            </div>
            <div className="field">
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
                Enabled
              </label>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="btn-vox btn-vox-primary" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving..." : editingId ? "Update" : "Create"} <span className="arrow">&gt;</span>
              </button>
              <button type="button" className="btn-vox" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        )}

        {!showForm && webhooks.length === 0 && (
          <p className="lede">No webhooks configured. Add one to receive events.</p>
        )}
      </div>

      <div className="panel panel-large">
        <h2>Configured Webhooks</h2>
        {webhooks.length === 0 ? (
          <p className="lede">No webhooks yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {webhooks.map(wh => (
              <div key={wh.id} style={{ padding: "14px", background: "var(--bg-surface)", border: `1px solid ${wh.enabled ? "var(--border)" : "rgba(100,100,100,0.3)"}`, opacity: wh.enabled ? 1 : 0.6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <strong style={{ fontSize: "13px" }}>{wh.url}</strong>
                    {wh.description && <p style={{ fontSize: "12px", color: "var(--fg-muted)", marginTop: "2px" }}>{wh.description}</p>}
                  </div>
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "3px", background: wh.enabled ? "rgba(16,185,129,0.15)" : "rgba(100,100,100,0.15)", color: wh.enabled ? "#10B981" : "#888" }}>
                      {wh.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {wh.events.map(ev => (
                    <span key={ev} style={{ fontSize: "10px", padding: "2px 6px", background: `${EVENT_COLORS[ev] ?? "#888"}18`, color: EVENT_COLORS[ev] ?? "#888", borderRadius: "3px" }}>
                      {ev.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--fg-muted)" }}>
                  <span>
                    {wh.lastTriggeredAt ? `Last: ${new Date(wh.lastTriggeredAt).toLocaleString()} (${wh.lastStatus ?? "unknown"})` : "Never triggered"}
                  </span>
                  {testResult && testing === null && (
                    <span style={{ fontSize: "11px", color: testResult.success ? "#10B981" : "var(--accent)" }}>
                      Test: {testResult.success ? `${testResult.status} in ${testResult.elapsed_ms}ms` : testResult.error}
                    </span>
                  )}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button type="button" style={{ fontSize: "11px", background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", padding: "2px 6px" }} disabled={testing === wh.id} onClick={() => void testWebhook(wh.id)}>{testing === wh.id ? "..." : "Test"}</button>
                    <button type="button" style={{ fontSize: "11px", background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", padding: "2px 6px" }} onClick={() => startEdit(wh)}>Edit</button>
                    <button type="button" style={{ fontSize: "11px", background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: "2px 6px" }} onClick={() => { if (confirm("Delete this webhook?")) void remove(wh.id); }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
