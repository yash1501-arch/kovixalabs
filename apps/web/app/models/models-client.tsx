"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type LlmModel = {
  id: string;
  workspaceId: string;
  provider: string;
  name: string;
  model: string;
  apiKey: string | null;
  baseUrl: string | null;
  capabilities: string[];
  isDefault: boolean;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const PROVIDERS = [
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"], defaultUrl: "https://api.openai.com/v1" },
  { value: "anthropic", label: "Anthropic", models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"], defaultUrl: "https://api.anthropic.com/v1" },
  { value: "google", label: "Google", models: ["gemini-1.5-pro", "gemini-1.5-flash"], defaultUrl: "https://generativelanguage.googleapis.com/v1" },
  { value: "openrouter", label: "OpenRouter", models: ["openai/gpt-4o", "anthropic/claude-3-opus", "google/gemini-1.5-pro"], defaultUrl: "https://openrouter.ai/api/v1" },
  { value: "local", label: "Local (Ollama)", models: ["llama3", "mistral", "codellama", "mixtral"], defaultUrl: "http://localhost:11434/v1" },
  { value: "custom", label: "Custom", models: [], defaultUrl: "" },
] as const;

const PROVIDER_LOGOS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d4a574",
  google: "#4285f4",
  openrouter: "#7c3aed",
  local: "#6b7280",
  custom: "#888",
};

const CAPABILITIES = ["chat", "embeddings", "images", "audio"] as const;

const emptyForm = {
  provider: "openai",
  name: "",
  model: "gpt-4o",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  capabilities: ["chat"] as string[],
  isDefault: false,
  maxTokens: 4096,
  temperature: 0.7,
};

export function ModelsClient() {
  const [models, setModels] = useState<LlmModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs: number; error?: string }>>({});
  const workspaceId = getWorkspaceId();

  async function load() {
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/llm-models`));
      if (res.ok) setModels(await res.json());
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const selectedProvider = PROVIDERS.find(p => p.value === form.provider);

  function onProviderChange(value: string) {
    const provider = PROVIDERS.find(p => p.value === value);
    setForm(f => ({
      ...f,
      provider: value,
      baseUrl: provider?.defaultUrl ?? "",
      model: (provider?.models[0] ?? f.model),
      capabilities: value === "local" ? ["chat"] : f.capabilities,
    }));
  }

  async function create() {
    if (!form.name || !form.model) { setStatus("Name and model are required."); return; }
    setSubmitting(true);
    setStatus("");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/llm-models`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          apiKey: form.apiKey || undefined,
          baseUrl: form.baseUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error("API error");
      await load();
      setForm(emptyForm);
      setShowForm(false);
      setStatus("Model added.");
    } catch { setStatus("Failed to add model."); }
    finally { setSubmitting(false); }
  }

  async function remove(modelId: string) {
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/llm-models/${modelId}`), { method: "DELETE" });
      setModels(prev => prev.filter(m => m.id !== modelId));
    } catch { /* silently fail */ }
  }

  async function setDefault(modelId: string) {
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/llm-models/${modelId}`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) await load();
    } catch { /* silently fail */ }
  }

  async function testModel(modelId: string) {
    setTesting(modelId);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/llm-models/${modelId}/test`), { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setTestResults(prev => ({ ...prev, [modelId]: result }));
      }
    } catch { /* silently fail */ }
    finally { setTesting(null); }
  }

  return (
    <section className="dashboard-grid">
      {status && (
        <div className="panel-full" style={{ gridColumn: "1 / -1", padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "13px", color: "var(--accent)" }}>
          {status}
        </div>
      )}

      <div className="panel panel-medium" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
          <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>LLM Models</h2>
          <button type="button" className="btn-vox btn-vox-primary" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={() => setShowForm(f => !f)}>
            {showForm ? "Cancel" : "+ Add Model"}
          </button>
        </div>

        {showForm && (
          <div style={{ display: "grid", gap: "10px", padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="field">
              <label>Provider</label>
              <select value={form.provider} onChange={e => onProviderChange(e.target.value)}>
                {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Display Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. GPT-4o Production" />
            </div>
            <div className="field">
              <label>Model</label>
              <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder={selectedProvider?.models[0] ?? "model-name"} list="model-suggestions" />
              <datalist id="model-suggestions">
                {selectedProvider?.models.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div className="field">
              <label>API Key</label>
              <input type="password" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} placeholder={form.provider === "local" ? "Not needed for local" : "sk-..."} />
            </div>
            <div className="field">
              <label>Base URL</label>
              <input value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} placeholder={selectedProvider?.defaultUrl ?? "https://..."} />
            </div>
            <div className="field">
              <label>Capabilities</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {CAPABILITIES.map(c => (
                  <label key={c} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", cursor: "pointer" }}>
                    <input type="checkbox" checked={form.capabilities.includes(c)} onChange={() => setForm(f => ({
                      ...f,
                      capabilities: f.capabilities.includes(c) ? f.capabilities.filter(x => x !== c) : [...f.capabilities, c],
                    }))} />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div className="field">
                <label>Max Tokens</label>
                <input type="number" min={1} max={128000} value={form.maxTokens} onChange={e => setForm(f => ({ ...f, maxTokens: Number(e.target.value) }))} />
              </div>
              <div className="field">
                <label>Temperature</label>
                <input type="number" min={0} max={2} step={0.1} value={form.temperature} onChange={e => setForm(f => ({ ...f, temperature: Number(e.target.value) }))} />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
              <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
              Set as default model
            </label>
            <button type="button" className="btn-vox btn-vox-primary" disabled={submitting} onClick={() => void create()}>
              {submitting ? "Adding..." : "Add Model"} <span className="arrow">&gt;</span>
            </button>
          </div>
        )}

        <div className="calendar-list" style={{ flex: 1, overflowY: "auto" }}>
          {loading ? <p className="lede">Loading models...</p> : models.length === 0 ? (
            <p className="lede" style={{ fontStyle: "italic" }}>No LLM models configured. Add OpenAI, Anthropic, or local models.</p>
          ) : models.map(m => {
            const testResult = testResults[m.id];
            return (
              <div key={m.id} className="calendar-item" style={{ opacity: m.enabled ? 1 : 0.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: PROVIDER_LOGOS[m.provider] ?? "#888", flexShrink: 0 }} />
                    <div>
                      <strong>{m.name}</strong>
                      {m.isDefault && <span style={{ marginLeft: "8px", fontSize: "10px", padding: "1px 6px", background: "var(--accent-soft)", color: "var(--accent)", borderRadius: "3px" }}>DEFAULT</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--fg-muted)", fontFamily: "monospace" }}>{m.model}</span>
                </div>
                <div style={{ display: "flex", gap: "6px", fontSize: "11px", color: "var(--fg-subtle)", marginTop: "4px" }}>
                  <span>{m.provider}</span>
                  <span>&middot;</span>
                  <span>{m.maxTokens} tokens</span>
                  {m.capabilities.length > 0 && <><span>&middot;</span><span>{m.capabilities.join(", ")}</span></>}
                </div>
                {testResult && (
                  <div style={{ fontSize: "11px", marginTop: "4px", color: testResult.success ? "#10B981" : "#EF4444" }}>
                    {testResult.success ? `Connected (${testResult.latencyMs}ms)` : `Failed: ${testResult.error?.slice(0, 60)}`}
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button type="button" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }} disabled={testing === m.id} onClick={() => void testModel(m.id)}>
                    {testing === m.id ? "Testing..." : "Test"}
                  </button>
                  {!m.isDefault && (
                    <button type="button" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#3B82F6", background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => void setDefault(m.id)}>
                      Set Default
                    </button>
                  )}
                  <button type="button" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)", background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => void remove(m.id)}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info panel */}
      <div className="panel panel-large">
        <h2>Model Configuration</h2>
        <div style={{ display: "grid", gap: "16px" }}>
          <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Provider Setup</h3>
            <p className="lede" style={{ fontSize: "13px" }}>
              Add API keys for the LLM providers you want to use. Models are stored per-workspace and encrypted at rest.
              The default model is used by AI features when no specific model is selected.
            </p>
          </div>

          <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Configured Models</h3>
            <div style={{ display: "grid", gap: "6px" }}>
              {models.length === 0 ? (
                <p className="lede">No models configured yet. Add one from the sidebar.</p>
              ) : (
                models.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: PROVIDER_LOGOS[m.provider] ?? "#888" }} />
                      <span style={{ fontSize: "13px" }}>{m.name}</span>
                      <code style={{ fontSize: "11px", color: "var(--fg-muted)" }}>{m.model}</code>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--fg-subtle)" }}>{m.provider}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Quick Start</h3>
            <ol style={{ fontSize: "13px", color: "var(--fg-muted)", lineHeight: 2, margin: 0, paddingLeft: "20px" }}>
              <li>Add an OpenAI model with your API key for text generation</li>
              <li>Add an Anthropic Claude model for advanced reasoning</li>
              <li>Set one model as default — it will be used across all AI features</li>
              <li>Use the "Test" button to verify connectivity</li>
              <li>Add a local Ollama model for offline inference</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
