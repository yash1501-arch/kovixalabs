"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type LlmModel = {
  id: string;
  name: string;
  provider: string;
  model: string;
  isDefault: boolean;
  enabled: boolean;
};

type Message = { role: "user" | "assistant"; content: string };

export function ChatClient() {
  const [models, setModels] = useState<LlmModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm connected to your workspace's LLM models. Ask me anything." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const workspaceId = getWorkspaceId();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(apiUrl(`/v1/workspaces/${workspaceId}/llm-models`))
      .then(r => r.ok ? r.json() : [])
      .then((m: LlmModel[]) => {
        setModels(m);
        const def = m.find(m => m.isDefault) ?? m[0];
        if (def) setSelectedModel(`${def.provider}/${def.model}`);
      })
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/chat`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })), model: selectedModel || undefined }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, the model request failed. Check your LLM model configuration." }]);
    }
    finally { setLoading(false); }
  }

  return (
    <section className="dashboard-grid">
      <div className="panel panel-medium" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "12px" }}>
          <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>AI Chat</h2>
          <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={{ fontSize: "12px", padding: "4px 8px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg)", outline: "none", maxWidth: "240px" }}>
            <option value="">Default model</option>
            {models.map(m => <option key={m.id} value={`${m.provider}/${m.model}`}>{m.name} ({m.provider}/{m.model}){m.isDefault ? " ★" : ""}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", padding: "0 4px" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "80%", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", lineHeight: 1.5, whiteSpace: "pre-wrap",
                background: msg.role === "user" ? "var(--accent)" : "var(--bg-surface)",
                color: msg.role === "user" ? "#fff" : "var(--fg)",
                border: msg.role === "user" ? "none" : "1px solid var(--border)",
              }}>{msg.content}</div>
            </div>
          ))}
          {loading && <div style={{ display: "flex", justifyContent: "flex-start" }}><div style={{ padding: "10px 14px", borderRadius: "8px", fontSize: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}>Thinking...</div></div>}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--border)", paddingTop: "12px", marginTop: "12px" }}>
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..."
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            style={{ flex: 1, padding: "10px 14px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg)", fontSize: "14px", outline: "none" }}
          />
          <button type="button" className="btn-vox btn-vox-primary" disabled={loading || !input.trim()} onClick={() => void send()} style={{ padding: "10px 20px" }}>
            Send
          </button>
        </div>
      </div>

      <div className="panel panel-large">
        <h2>Connected Models</h2>
        {models.length === 0 ? (
          <p className="lede">No LLM models configured. Add models in <a href="/models" style={{ color: "var(--accent)" }}>LLM Models</a>.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {models.map(m => (
              <div key={m.id} style={{ padding: "12px", background: "var(--bg-surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{m.name}</strong>
                  <span style={{ marginLeft: "8px", fontSize: "12px", color: "var(--fg-muted)" }}>{m.provider}/{m.model}</span>
                  {m.isDefault && <span style={{ marginLeft: "6px", fontSize: "11px", color: "var(--accent)" }}>★ default</span>}
                </div>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: m.enabled ? "#10B981" : "var(--fg-subtle)",
                }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
