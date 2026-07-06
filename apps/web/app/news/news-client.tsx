"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Brand = { id: string; name: string };
type Source = { id: string; name: string; url: string; type: string; category: string | null; active: boolean; lastScrapedAt: string | null };
type Article = {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  summary: string | null;
  author: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
  category: string | null;
  keywords: string[];
  relevanceScore: number | null;
  sentiment: string | null;
  read: boolean;
  saved: boolean;
};

export function NewsClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sourceForm, setSourceForm] = useState({ brandId: "", name: "", url: "", type: "RSS", category: "" });
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("");
  const [scraping, setScraping] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const workspaceId = getWorkspaceId();

  async function loadData() {
    try {
      const [brandsRes, srcRes, artRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/news/sources`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/news/articles`)),
      ]);
      if (brandsRes.ok) setBrands(await brandsRes.json());
      if (srcRes.ok) setSources(await srcRes.json());
      if (artRes.ok) setArticles(await artRes.json());
    } catch { setStatus("Failed to load data"); }
  }

  useEffect(() => { void loadData(); }, []);

  async function addSource() {
    setCreating(true);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/news/sources`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sourceForm),
      });
      if (!res.ok) throw new Error(await res.text());
      setSourceForm({ brandId: sourceForm.brandId, name: "", url: "", type: "RSS", category: "" });
      setShowForm(false);
      await loadData();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to add source");
    } finally {
      setCreating(false);
    }
  }

  async function scrapeSource(sourceId: string) {
    setScraping(sourceId);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/news/sources/${sourceId}/scrape`), { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStatus(`Scraped: ${data.newArticles} new articles out of ${data.total} total.`);
      await loadData();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Scrape failed");
    } finally {
      setScraping(null);
    }
  }

  async function analyzeAll() {
    setAnalyzing(true);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/news/analyze`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStatus(`Analyzed: ${data.analyzed} articles.`);
      await loadData();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function deleteSource(sourceId: string) {
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/news/sources/${sourceId}`), { method: "DELETE" });
      await loadData();
    } catch { /* ignore */ }
  }

  const sentimentColor = (s: string | null) => {
    if (s === "positive") return "#22c55e";
    if (s === "negative") return "#ef4444";
    return "#888";
  };

  return (
    <section className="dashboard-grid" aria-label="News scraper">
      <div className="panel panel-medium">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2>Sources</h2>
          <button className="btn-vox btn-vox-secondary" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add Source"}
          </button>
        </div>

        {showForm && (
          <form className="studio-form" onSubmit={(e) => { e.preventDefault(); void addSource(); }} style={{ marginBottom: "16px", padding: "16px", background: "var(--bg-surface)", borderRadius: "8px" }}>
            <div className="field">
              <label>Brand</label>
              <select value={sourceForm.brandId} onChange={(e) => setSourceForm({ ...sourceForm, brandId: e.target.value })} required>
                <option value="">Select brand</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Name</label>
              <input value={sourceForm.name} onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })} placeholder="e.g. TechCrunch AI" required />
            </div>
            <div className="field">
              <label>URL</label>
              <input value={sourceForm.url} onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })} placeholder="https://example.com/rss" required />
            </div>
            <div className="field">
              <label>Category</label>
              <input value={sourceForm.category} onChange={(e) => setSourceForm({ ...sourceForm, category: e.target.value })} placeholder="e.g. AI, Marketing" />
            </div>
            <button type="submit" className="btn-vox btn-vox-primary" disabled={creating}>
              {creating ? "Adding..." : "Add Source"}
            </button>
          </form>
        )}

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <button className="btn-vox btn-vox-secondary" style={{ fontSize: "12px" }} disabled={analyzing} onClick={() => void analyzeAll()}>
            {analyzing ? "Analyzing..." : "Analyze All"}
          </button>
        </div>

        {sources.length === 0 ? (
          <p className="lede">No news sources configured. Add an RSS feed to start monitoring.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sources.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "var(--bg-surface)", borderRadius: "8px" }}>
                <div>
                  <strong>{s.name}</strong>
                  <small style={{ display: "block", color: "var(--fg-muted)" }}>{s.url}</small>
                  <small style={{ color: "var(--fg-muted)" }}>{s.category ?? "No category"}</small>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button className="btn-vox btn-vox-secondary" style={{ fontSize: "11px", padding: "4px 10px" }} disabled={scraping === s.id} onClick={() => void scrapeSource(s.id)}>
                    {scraping === s.id ? "..." : "Scrape"}
                  </button>
                  <button className="btn-vox btn-vox-secondary" style={{ fontSize: "11px", padding: "4px 10px" }} onClick={() => void deleteSource(s.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {status && <p className="lede" style={{ marginTop: "12px" }}>{status}</p>}
      </div>

      <div className="panel panel-large">
        <h2>Articles ({articles.length})</h2>
        {articles.length === 0 ? (
          <p className="lede">No articles yet. Add a news source and scrape it.</p>
        ) : (
          <div className="result-grid">
            {articles.map((a) => (
              <article key={a.id} className="result-card" style={{ opacity: a.read ? 0.6 : 1 }}>
                <div style={{ display: "flex", gap: "12px" }}>
                  {a.imageUrl && (
                    <img src={a.imageUrl} alt="" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: "var(--fg)", textDecoration: "none" }}>
                      {a.title}
                    </a>
                    {a.summary && <p className="lede" style={{ fontSize: "12px", marginTop: "4px" }}>{a.summary}</p>}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px", fontSize: "11px", color: "var(--fg-muted)" }}>
                      {a.author && <span>{a.author}</span>}
                      {a.publishedAt && <span>{new Date(a.publishedAt).toLocaleDateString()}</span>}
                      {a.sentiment && <span style={{ color: sentimentColor(a.sentiment) }}>{a.sentiment}</span>}
                      {a.relevanceScore !== null && <span>Relevance: {Math.round(a.relevanceScore * 100)}%</span>}
                    </div>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                      {a.keywords.map((kw) => (
                        <span key={kw} style={{ fontSize: "10px", padding: "2px 6px", background: "var(--accent-soft)", borderRadius: "4px", color: "var(--accent)" }}>{kw}</span>
                      ))}
                    </div>
                    <div style={{ marginTop: "8px" }}>
                      <a
                        href={`/content?topic=${encodeURIComponent(a.title)}`}
                        className="btn-vox btn-vox-primary"
                        style={{ fontSize: "11px", padding: "4px 12px", textDecoration: "none" }}
                      >
                        Create Post <span className="arrow">&gt;</span>
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
