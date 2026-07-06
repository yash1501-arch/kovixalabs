"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type SearchResult = {
  posts: Array<{ id: string; platform: string; caption: string; status: string }>;
  brands: Array<{ id: string; name: string; description: string | null }>;
  campaigns: Array<{ id: string; platform: string; objective: string; status: string }>;
  articles: Array<{ id: string; title: string; url: string }>;
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const workspaceId = getWorkspaceId();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !workspaceId) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/search?q=${encodeURIComponent(q)}`));
      if (res.ok) setResults(await res.json());
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const timer = setTimeout(() => void doSearch(query), 200);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const totalCount = results
    ? results.posts.length + results.brands.length + results.campaigns.length + results.articles.length
    : 0;

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.7)", zIndex: 2000,
        display: "flex", justifyContent: "center", paddingTop: "80px",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          background: "var(--bg-base)", border: "1px solid var(--border)",
          borderRadius: "12px", width: "560px", maxWidth: "90vw",
          maxHeight: "60vh", display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, brands, campaigns, articles..."
            style={{
              width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border)",
              padding: "12px 16px", fontSize: "15px", color: "var(--fg)",
              outline: "none", borderRadius: "8px",
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {loading && (
            <p style={{ textAlign: "center", padding: "24px", color: "var(--fg-muted)", fontSize: "13px" }}>
              Searching...
            </p>
          )}

          {!loading && query && !totalCount && (
            <p style={{ textAlign: "center", padding: "24px", color: "var(--fg-muted)", fontSize: "13px" }}>
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {!loading && !query && (
            <p style={{ textAlign: "center", padding: "24px", color: "var(--fg-subtle)", fontSize: "12px" }}>
              Type to search across your workspace
            </p>
          )}

          {results && results.posts.length > 0 && (
            <Section title="Posts">
              {results.posts.map((p) => (
                <ResultItem
                  key={p.id}
                  href="/calendar"
                  label={`${p.platform} — ${p.caption.slice(0, 60)}`}
                  meta={p.status}
                />
              ))}
            </Section>
          )}

          {results && results.brands.length > 0 && (
            <Section title="Brands">
              {results.brands.map((b) => (
                <ResultItem
                  key={b.id}
                  href="/brands"
                  label={b.name}
                  meta={b.description?.slice(0, 40) ?? ""}
                />
              ))}
            </Section>
          )}

          {results && results.campaigns.length > 0 && (
            <Section title="Campaigns">
              {results.campaigns.map((c) => (
                <ResultItem
                  key={c.id}
                  href="/campaigns"
                  label={`${c.platform} — ${c.objective}`}
                  meta={c.status}
                />
              ))}
            </Section>
          )}

          {results && results.articles.length > 0 && (
            <Section title="Articles">
              {results.articles.map((a) => (
                <ResultItem
                  key={a.id}
                  href="/news"
                  label={a.title.slice(0, 80)}
                  meta="article"
                />
              ))}
            </Section>
          )}
        </div>

        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", fontSize: "11px", color: "var(--fg-subtle)", display: "flex", gap: "16px" }}>
          <span>&uarr;&darr; Navigate</span>
          <span>&crarr; Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ padding: "6px 16px", fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-subtle)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ResultItem({ href, label, meta }: { href: string; label: string; meta: string }) {
  return (
    <a
      href={href}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 16px", textDecoration: "none", color: "inherit",
        transition: "background 0.15s",
      }}
      className="search-result-item"
    >
      <span style={{ fontSize: "14px", color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ fontSize: "11px", color: "var(--fg-subtle)", flexShrink: 0, marginLeft: "12px" }}>
        {meta}
      </span>
    </a>
  );
}
