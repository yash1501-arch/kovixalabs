"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Brand = { id: string; name: string };

type MemoryDocument = {
  id: string;
  brandId: string;
  title: string;
  content: string;
  sourceType: string;
  mimeType: string | null;
  fileSize: number | null;
  chunkCount: number;
  embedded: boolean;
  tags: string[];
  createdAt: string;
};

export function DocumentsClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [tab, setTab] = useState<"ingest" | "manage">("ingest");
  const [form, setForm] = useState({ title: "", content: "", tags: "", sourceType: "manual" });
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [documents, setDocuments] = useState<MemoryDocument[]>([]);
  const [docStats, setDocStats] = useState<{ totalDocuments: number; embeddedDocuments: number; pendingEmbedding: number } | null>(null);
  const workspaceId = getWorkspaceId();

  useEffect(() => {
    fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`))
      .then(r => r.ok ? r.json() : [])
      .then(setBrands)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedBrandId) return;
    loadDocuments();
  }, [selectedBrandId]);

  async function loadDocuments() {
    try {
      const [docsRes, statsRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands/${selectedBrandId}/documents`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands/${selectedBrandId}/documents/stats`)),
      ]);
      if (docsRes.ok) setDocuments(await docsRes.json());
      if (statsRes.ok) setDocStats(await statsRes.json());
    } catch { /* silently fail */ }
  }

  async function createDocument() {
    if (!form.title.trim() || !form.content.trim() || !selectedBrandId) {
      setStatus("Fill in all required fields.");
      return;
    }
    setProcessing(true);
    setStatus("Creating document and embedding into brand memory...");
    setResult(null);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands/${selectedBrandId}/documents`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          sourceType: form.sourceType,
          tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setStatus(`Document "${data.title}" created and embedded.`);
      setForm({ title: "", content: "", tags: "", sourceType: "manual" });
      await loadDocuments();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Creation failed");
    } finally {
      setProcessing(false);
    }
  }

  async function deleteDocument(documentId: string) {
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/documents/${documentId}`), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      await loadDocuments();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function reembedDocuments() {
    if (!selectedBrandId) return;
    setProcessing(true);
    setStatus("Re-embedding all documents...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands/${selectedBrandId}/documents/reembed`), {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStatus(`Re-embedded ${data.reembedded} documents.`);
      await loadDocuments();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Re-embedding failed");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="dashboard-grid">
      <div className="panel panel-medium">
        <h2>Brand Documents</h2>
        {status && (
          <div style={{ padding: "12px 16px", marginBottom: "16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "13px", color: "var(--accent)" }}>
            {status}
          </div>
        )}

        <div className="field">
          <label>Brand</label>
          <select value={selectedBrandId} onChange={e => setSelectedBrandId(e.target.value)} required>
            <option value="">Select brand</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        {docStats && (
          <div className="metric-row" style={{ marginBottom: "16px" }}>
            <div className="metric"><span>Total</span><strong>{docStats.totalDocuments}</strong></div>
            <div className="metric"><span>Embedded</span><strong>{docStats.embeddedDocuments}</strong></div>
            <div className="metric"><span>Pending</span><strong>{docStats.pendingEmbedding}</strong></div>
          </div>
        )}

        <div style={{ display: "flex", gap: "4px", marginBottom: "16px", background: "var(--bg-surface)", borderRadius: "6px", padding: "4px" }}>
          <button type="button" className="btn-vox" style={{ flex: 1, ...(tab === "ingest" ? { background: "var(--accent)", color: "#fff" } : {}) }} onClick={() => setTab("ingest")}>New Document</button>
          <button type="button" className="btn-vox" style={{ flex: 1, ...(tab === "manage" ? { background: "var(--accent)", color: "#fff" } : {}) }} onClick={() => setTab("manage")}>Manage ({documents.length})</button>
        </div>

        {tab === "ingest" && (
          <>
            <div className="field">
              <label>Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Document title" />
            </div>
            <div className="field">
              <label>Content</label>
              <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Paste document content here..." style={{ minHeight: "200px" }} />
            </div>
            <div className="field">
              <label>Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="brand-guidelines, tone-of-voice" />
            </div>
            <div className="field">
              <label>Source</label>
              <select value={form.sourceType} onChange={e => setForm({ ...form, sourceType: e.target.value })}>
                <option value="manual">Manual</option>
                <option value="upload">Upload</option>
                <option value="web">Web</option>
                <option value="api">API</option>
              </select>
            </div>
            <button type="button" className="btn-vox btn-vox-primary" disabled={processing || !form.title.trim() || !form.content.trim() || !selectedBrandId} onClick={() => void createDocument()}>
              {processing ? "Processing..." : "Create & Embed Document"} <span className="arrow">&gt;</span>
            </button>

            {result && (
              <div style={{ marginTop: "16px", padding: "12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px" }}>
                <p style={{ fontSize: "13px", fontWeight: 600 }}>{result.title}</p>
                <p style={{ fontSize: "12px", color: "var(--fg-muted)" }}>Embedded: {result.embedded ? "Yes" : "No"} | Chunks: {result.chunkCount}</p>
                {result.tags?.length > 0 && (
                  <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                    {result.tags.map((t: string) => <span key={t} style={{ fontSize: "11px", padding: "2px 6px", background: "rgba(236,0,47,0.1)", borderRadius: "3px", color: "var(--accent)" }}>{t}</span>)}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === "manage" && (
          <>
            <button type="button" className="btn-vox" disabled={processing || !selectedBrandId} onClick={() => void reembedDocuments()} style={{ marginBottom: "12px" }}>
              {processing ? "Re-embedding..." : "Re-embed All Documents"}
            </button>
            {documents.length === 0 ? (
              <p className="lede">No documents for this brand.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {documents.map(doc => (
                  <div key={doc.id} style={{ padding: "12px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div>
                        <strong style={{ fontSize: "13px" }}>{doc.title}</strong>
                        <p style={{ fontSize: "12px", color: "var(--fg-muted)", marginTop: "4px" }}>
                          {doc.content.slice(0, 120)}...
                        </p>
                        <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", padding: "2px 6px", background: doc.embedded ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", borderRadius: "3px", color: doc.embedded ? "#10B981" : "#F59E0B" }}>
                            {doc.embedded ? "Embedded" : "Pending"}
                          </span>
                          <span style={{ fontSize: "11px", padding: "2px 6px", background: "var(--bg-base)", borderRadius: "3px", color: "var(--fg-muted)" }}>
                            {doc.chunkCount} chunks
                          </span>
                          <span style={{ fontSize: "11px", padding: "2px 6px", background: "var(--bg-base)", borderRadius: "3px", color: "var(--fg-muted)" }}>
                            {doc.sourceType}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-vox"
                        style={{ fontSize: "11px", padding: "4px 8px", color: "var(--accent)" }}
                        onClick={() => void deleteDocument(doc.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="panel panel-large">
        <h2>Brand Memory Search</h2>
        <p className="lede">Documents created here are automatically chunked, embedded via the AI service, and stored in Qdrant vector search. They become searchable brand context for all AI content generation.</p>
        <div style={{ marginTop: "16px", padding: "16px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "6px" }}>
          <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>How it works</h3>
          <ol style={{ fontSize: "13px", lineHeight: 1.8, paddingLeft: "16px", color: "var(--fg-muted)" }}>
            <li>Select a brand and create a document with title and content</li>
            <li>The document is stored in PostgreSQL for management</li>
            <li>Content is sent to the AI service for embedding into Qdrant</li>
            <li>Brand context becomes available for copy generation, hashtag suggestions, and more</li>
            <li>Use the Brands page to search your brand memory</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
