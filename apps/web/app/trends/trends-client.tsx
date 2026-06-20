"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Trend = {
  id: string;
  workspaceId: string;
  topic: string;
  platform: string | null;
  category: "viral" | "industry" | "niche" | "evergreen";
  score: number;
  velocity: "rising" | "peak" | "declining";
  hashtags: string[];
  relatedTopics: string[];
  estimatedReach: number;
  engagementPotential: "high" | "medium" | "low";
  createdAt: string;
  updatedAt: string;
};

const CATEGORIES = ["all", "viral", "industry", "niche", "evergreen"] as const;
type CategoryFilter = typeof CATEGORIES[number];

const VELOCITY_COLORS = {
  rising: "#22c55e",
  peak: "#f59e0b",
  declining: "var(--fg-subtle)"
};

const VELOCITY_LABELS = {
  rising: "Rising",
  peak: "Peak",
  declining: "Declining"
};

const POTENTIAL_COLORS = {
  high: "var(--accent)",
  medium: "#f59e0b",
  low: "var(--fg-subtle)"
};

const CATEGORY_COLORS: Record<string, string> = {
  viral: "#E4405F",
  industry: "#0A66C2",
  niche: "#8B5CF6",
  evergreen: "#10B981"
};

function formatReach(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

export function TrendsClient() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  async function load() {
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/trends`));
      if (res.ok) setTrends(await res.json());
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }

  async function refresh() {
    setRefreshing(true);
    setStatus("Refreshing trend signals...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/trends/refresh`), { method: "POST" });
      if (res.ok) { setTrends(await res.json()); setStatus("Trends refreshed."); }
    } catch { setStatus("Refresh failed."); }
    finally { setRefreshing(false); }
  }

  useEffect(() => { void load(); }, []);

  const filtered = trends.filter(t => {
    const matchCat = filter === "all" || t.category === filter;
    const matchSearch = !search || t.topic.toLowerCase().includes(search.toLowerCase()) ||
      t.hashtags.some(h => h.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const risingCount = trends.filter(t => t.velocity === "rising").length;
  const highPotential = trends.filter(t => t.engagementPotential === "high").length;

  return (
    <>
      {status && (
        <div style={{ marginBottom: "20px", padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontFamily: "var(--font-heading)", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>
          {status}
        </div>
      )}

      {/* Stats row */}
      <div style={{ marginBottom: "24px" }}>
        <div className="metric-row">
          <div className="metric"><span>Trends Tracked</span><strong>{trends.length}</strong></div>
          <div className="metric"><span>Rising</span><strong style={{ color: "#22c55e" }}>{risingCount}</strong></div>
          <div className="metric"><span>High Potential</span><strong style={{ color: "var(--accent)" }}>{highPotential}</strong></div>
          <div className="metric"><span>At Peak</span><strong style={{ color: "#f59e0b" }}>{trends.filter(t => t.velocity === "peak").length}</strong></div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={filter === cat ? "btn-vox btn-vox-primary" : "btn-vox btn-vox-secondary"}
              style={{ fontSize: "12px", padding: "6px 14px", textTransform: "capitalize" }}
            >
              {cat}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search trends..."
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg)", fontFamily: "var(--font-body)", fontSize: "15px", padding: "8px 14px", outline: "none", minWidth: "200px", flex: 1 }}
        />
        <button
          type="button"
          className="btn-vox btn-vox-secondary"
          disabled={refreshing}
          onClick={() => void refresh()}
          style={{ fontSize: "12px", padding: "6px 16px", whiteSpace: "nowrap" }}
        >
          {refreshing ? "Refreshing..." : "Refresh Signals"}
        </button>
      </div>

      {/* Trend cards grid */}
      {loading ? (
        <p className="lede">Loading trend signals...</p>
      ) : filtered.length === 0 ? (
        <p className="lede">No trends match the current filter.</p>
      ) : (
        <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {filtered.map(trend => (
            <div
              key={trend.id}
              className="panel"
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "26px", fontWeight: 800, color: "var(--accent)", lineHeight: 1, marginBottom: "6px" }}>
                    {trend.score}
                  </div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em", color: "var(--fg)", lineHeight: 1.2 }}>
                    {trend.topic}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
                  <span style={{
                    fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em",
                    padding: "3px 8px", background: `${CATEGORY_COLORS[trend.category] ?? "var(--accent)"}18`,
                    color: CATEGORY_COLORS[trend.category] ?? "var(--accent)",
                    border: `1px solid ${CATEGORY_COLORS[trend.category] ?? "var(--accent)"}40`
                  }}>{trend.category}</span>
                  <span style={{
                    fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em",
                    padding: "3px 8px", background: `${VELOCITY_COLORS[trend.velocity]}18`,
                    color: VELOCITY_COLORS[trend.velocity],
                    border: `1px solid ${VELOCITY_COLORS[trend.velocity]}40`
                  }}>{VELOCITY_LABELS[trend.velocity]}</span>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: "16px" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "2px" }}>Est. Reach</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 700, color: "var(--fg)" }}>{formatReach(trend.estimatedReach)}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "2px" }}>Potential</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 700, color: POTENTIAL_COLORS[trend.engagementPotential] }}>{trend.engagementPotential}</div>
                </div>
              </div>

              {/* Hashtags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {trend.hashtags.map(tag => (
                  <span key={tag} style={{ fontFamily: "var(--font-heading)", fontSize: "11px", padding: "2px 8px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}>{tag}</span>
                ))}
              </div>

              {/* Related topics */}
              <div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "4px" }}>Related</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg-subtle)", fontStyle: "italic" }}>
                  {trend.relatedTopics.join(" · ")}
                </div>
              </div>

              {/* CTA */}
              <div style={{ marginTop: "auto" }}>
                <a
                  href={`/content?topic=${encodeURIComponent(trend.topic)}`}
                  className="btn-vox btn-vox-primary"
                  style={{ fontSize: "12px", padding: "7px 16px", display: "inline-flex" }}
                >
                  Use This Trend <span className="arrow">-&gt;</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
