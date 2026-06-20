"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type AnalyticsData = {
  workspaceId: string;
  period: string;
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  draftPosts: number;
  totalImpressions: number;
  totalEngagements: number;
  totalReach: number;
  engagementRate: number;
  platformBreakdown: Array<{
    platform: string;
    posts: number;
    impressions: number;
    engagements: number;
  }>;
  dailyStats: Array<{
    date: string;
    impressions: number;
    engagements: number;
  }>;
};

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X / Twitter",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube"
};

const platformColors: Record<string, string> = {
  instagram: "#E4405F",
  linkedin: "#0A66C2",
  x: "#888888",
  facebook: "#1877F2",
  tiktok: "#69C9D0",
  youtube: "#FF0000"
};

function BarChart({ data }: { data: Array<{ date: string; impressions: number; engagements: number }> }) {
  const max = Math.max(...data.map(d => d.impressions), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "120px", width: "100%" }}>
      {data.slice(-30).map((day, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", gap: "2px" }}>
          <div
            style={{
              width: "100%",
              background: `linear-gradient(180deg, var(--accent) 0%, rgba(236,0,47,0.3) 100%)`,
              borderRadius: "2px 2px 0 0",
              height: `${Math.max(4, (day.impressions / max) * 100)}%`,
              transition: "height 0.4s cubic-bezier(0.16,1,0.3,1)",
              minWidth: "4px"
            }}
            title={`${day.date}: ${formatNum(day.impressions)} impressions`}
          />
        </div>
      ))}
    </div>
  );
}

export function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const workspaceId = getWorkspaceId();

  async function load(p: "7d" | "30d" | "90d") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/analytics?period=${p}`));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(period); }, [period]);

  return (
    <section className="dashboard-grid" aria-label="Analytics overview">
      {/* Period selector */}
      <div className="panel-full" style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "8px", padding: "0 0 4px" }}>
        {(["7d", "30d", "90d"] as const).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={period === p ? "btn-vox btn-vox-primary" : "btn-vox btn-vox-secondary"}
            style={{ fontSize: "13px", padding: "6px 16px" }}
          >
            {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
          </button>
        ))}
      </div>

      {/* Key metrics */}
      <div className="panel-full" style={{ gridColumn: "1 / -1" }}>
        <div className="metric-row">
          <div className="metric">
            <span>Impressions</span>
            <strong>{loading ? "—" : formatNum(data?.totalImpressions ?? 0)}</strong>
          </div>
          <div className="metric">
            <span>Reach</span>
            <strong>{loading ? "—" : formatNum(data?.totalReach ?? 0)}</strong>
          </div>
          <div className="metric">
            <span>Engagements</span>
            <strong>{loading ? "—" : formatNum(data?.totalEngagements ?? 0)}</strong>
          </div>
          <div className="metric">
            <span>Engagement Rate</span>
            <strong>{loading ? "—" : `${data?.engagementRate ?? 0}%`}</strong>
          </div>
        </div>
      </div>

      {/* Impressions chart */}
      <div className="panel panel-large">
        <h2>Daily Impressions</h2>
        {loading ? (
          <p className="lede">Loading chart...</p>
        ) : data?.dailyStats?.length ? (
          <>
            <BarChart data={data.dailyStats} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)" }}>
                {data.dailyStats[0]?.date}
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)" }}>
                {data.dailyStats[data.dailyStats.length - 1]?.date}
              </span>
            </div>
          </>
        ) : (
          <p className="lede">Publish posts to see impression data.</p>
        )}
      </div>

      {/* Post status breakdown */}
      <div className="panel panel-medium">
        <h2>Post Status</h2>
        {loading ? <p className="lede">Loading...</p> : (
          <div style={{ display: "grid", gap: "12px" }}>
            {[
              { label: "Published", value: data?.publishedPosts ?? 0, color: "var(--accent)" },
              { label: "Scheduled", value: data?.scheduledPosts ?? 0, color: "#3B82F6" },
              { label: "Draft", value: data?.draftPosts ?? 0, color: "var(--fg-muted)" }
            ].map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-muted)" }}>{item.label}</span>
                </div>
                <strong style={{ fontFamily: "var(--font-heading)", fontSize: "20px", fontWeight: 800, color: "var(--fg)" }}>{item.value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform breakdown */}
      <div className="panel panel-full">
        <h2>Platform Performance</h2>
        {loading ? <p className="lede">Loading...</p> : error ? (
          <p className="lede">{error} — Start the API server to see live data.</p>
        ) : !data?.platformBreakdown?.length ? (
          <p className="lede">No platform data yet. Connect accounts and publish posts.</p>
        ) : (
          <div style={{ display: "grid", gap: "1px", border: "1px solid var(--border)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "10px 16px", background: "var(--bg-surface)" }}>
              {["Platform", "Posts", "Impressions", "Engagements", "Eng. Rate"].map(h => (
                <span key={h} style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)" }}>{h}</span>
              ))}
            </div>
            {data.platformBreakdown.map(row => {
              const rate = row.impressions > 0 ? ((row.engagements / row.impressions) * 100).toFixed(1) : "0.0";
              return (
                <div key={row.platform} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "14px 16px", background: "var(--bg-base)", borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: platformColors[row.platform] ?? "var(--accent)" }} />
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--fg)" }}>
                      {platformLabels[row.platform] ?? row.platform}
                    </span>
                  </div>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg)" }}>{row.posts}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg)" }}>{formatNum(row.impressions)}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg)" }}>{formatNum(row.engagements)}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--accent)" }}>{rate}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
