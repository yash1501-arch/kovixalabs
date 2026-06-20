"use client";

import { useEffect, useState, useCallback } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type LearningInsight = {
  id: string;
  brandId: string;
  platform: string | null;
  type: string;
  title: string;
  description: string;
  confidence: number;
  dataPoints: number;
  recommendation: string;
  createdAt: string;
};

type LearningProfile = {
  id: string;
  brandId: string;
  bestPostingTimes: { day: string; hour: number; engagementScore: number }[];
  topPerformingTopics: string[];
  bestEngagingStyles: string[];
  avgEngagementRate: number;
  totalPostsAnalyzed: number;
  improvementScore: number;
  lastUpdatedAt: string;
};

type Brand = { id: string; name: string };

const INSIGHT_TYPE_COLORS: Record<string, string> = {
  best_time: "#3B82F6",
  top_topic: "#10B981",
  best_style: "#8B5CF6",
  platform_tip: "#F59E0B",
  engagement_pattern: "var(--accent)"
};

const STYLE_COLORS: Record<string, string> = {
  educational: "#3B82F6",
  entertaining: "#F59E0B",
  promotional: "var(--accent)",
  storytelling: "#8B5CF6",
  mixed: "#10B981",
  inspirational: "#EC4899"
};

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:00 ${ampm}`;
}

function confidenceColor(confidence: number): string {
  if (confidence > 0.8) return "#10B981";
  if (confidence >= 0.6) return "#F59E0B";
  return "#6B7280";
}

export function LearningClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const workspaceId = getWorkspaceId();

  const loadBrands = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`));
      if (res.ok) {
        const b: Brand[] = await res.json();
        setBrands(b);
      }
    } catch { /* silently fail */ }
  }, [workspaceId]);

  useEffect(() => { void loadBrands(); }, [loadBrands]);

  const loadInsightsAndProfile = useCallback(async (brandId: string) => {
    try {
      const [insightsRes, profileRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/learning/insights?brandId=${brandId}`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/learning/profile?brandId=${brandId}`))
      ]);
      if (insightsRes.ok) setInsights(await insightsRes.json());
      if (profileRes.ok) setProfile(await profileRes.json());
    } catch { /* silently fail */ }
  }, [workspaceId]);

  useEffect(() => {
    if (selectedBrandId) void loadInsightsAndProfile(selectedBrandId);
  }, [selectedBrandId, loadInsightsAndProfile]);

  async function analyzeNow() {
    if (!selectedBrandId) return;
    setAnalyzing(true);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/learning/analyze`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId: selectedBrandId })
      });
      if (res.ok) {
        await loadInsightsAndProfile(selectedBrandId);
      }
    } catch { /* silently fail */ }
    finally { setAnalyzing(false); }
  }

  const bestDay = profile?.bestPostingTimes.length
    ? profile.bestPostingTimes.reduce<{ day: string; hour: number; engagementScore: number } | undefined>(
        (best, t) => (best === undefined || t.engagementScore > best.engagementScore ? t : best),
        undefined
      ) ?? null
    : null;

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <p className="eyebrow">AI Intelligence</p>
          <h1 className="topbar-title">Learning Loop</h1>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            value={selectedBrandId}
            onChange={e => setSelectedBrandId(e.target.value)}
            style={{
              fontFamily: "var(--font-heading)", fontSize: "12px", textTransform: "uppercase",
              letterSpacing: "0.05em", padding: "8px 14px",
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              color: "var(--fg)", outline: "none", cursor: "pointer"
            }}
          >
            <option value="">Select brand</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button
            type="button"
            className="btn-vox btn-vox-primary"
            disabled={!selectedBrandId || analyzing}
            onClick={() => void analyzeNow()}
          >
            {analyzing ? "Analyzing..." : "Analyze Now"} <span className="arrow">-&gt;</span>
          </button>
        </div>
      </div>

      {!selectedBrandId ? (
        <div className="panel" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px", gap: "16px" }}>
          <p className="lede">Select a brand to view learning insights and performance analysis.</p>
        </div>
      ) : (
        <>
          {/* Profile summary metrics */}
          <div className="metric-row" style={{ marginBottom: "24px" }}>
            <div className="metric">
              <span>Improvement Score</span>
              <strong style={{ color: "var(--accent)" }}>{profile?.improvementScore ?? 0}/100</strong>
            </div>
            <div className="metric">
              <span>Avg Engagement Rate</span>
              <strong style={{ color: "#10B981" }}>{profile ? `${profile.avgEngagementRate.toFixed(1)}%` : "—"}</strong>
            </div>
            <div className="metric">
              <span>Posts Analyzed</span>
              <strong>{profile?.totalPostsAnalyzed ?? 0}</strong>
            </div>
            <div className="metric">
              <span>Best Day</span>
              <strong>{bestDay?.day ?? "—"}</strong>
            </div>
          </div>

          {/* Performance score bar */}
          {profile && (
            <div className="panel" style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)" }}>PERFORMANCE SCORE</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "22px", fontWeight: 800, color: "var(--accent)" }}>{profile.improvementScore}<span style={{ fontSize: "13px", color: "var(--fg-muted)" }}>/100</span></div>
              </div>
              <div style={{ height: "10px", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "2px" }}>
                <div style={{
                  height: "100%",
                  width: `${profile.improvementScore}%`,
                  background: `linear-gradient(90deg, var(--accent), #F59E0B)`,
                  transition: "width 0.5s ease",
                  borderRadius: "2px"
                }} />
              </div>
            </div>
          )}

          {/* Two-column: posting times + topics/styles */}
          {profile && (
            <section className="dashboard-grid" style={{ marginBottom: "24px" }}>
              {/* Left: Best posting times */}
              <div className="panel panel-medium">
                <h2 style={{ margin: 0, borderBottom: "none", padding: 0, marginBottom: "16px" }}>Best Posting Times</h2>
                {profile.bestPostingTimes.length === 0 ? (
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg-muted)", fontStyle: "italic" }}>No timing data yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: "8px" }}>
                    {profile.bestPostingTimes.slice(0, 8).map((t, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 70px 1fr", gap: "10px", alignItems: "center" }}>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--fg)" }}>{t.day}</div>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg-muted)" }}>{formatHour(t.hour)}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ flex: 1, height: "6px", background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                            <div style={{
                              height: "100%",
                              width: `${Math.min(100, t.engagementScore * 100)}%`,
                              background: "#10B981"
                            }} />
                          </div>
                          <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: "#10B981", minWidth: "36px" }}>{(t.engagementScore * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Topics + Styles */}
              <div className="panel panel-large" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "10px" }}>TOP TOPICS</div>
                  {profile.topPerformingTopics.length === 0 ? (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg-muted)", fontStyle: "italic" }}>No topic data yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {profile.topPerformingTopics.map((topic, i) => (
                        <span key={i} style={{
                          fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase",
                          letterSpacing: "0.04em", padding: "5px 12px",
                          background: "var(--accent-soft)", color: "var(--accent)",
                          border: "1px solid rgba(236,0,47,0.2)"
                        }}>{topic}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "10px" }}>BEST STYLES</div>
                  {profile.bestEngagingStyles.length === 0 ? (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg-muted)", fontStyle: "italic" }}>No style data yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {profile.bestEngagingStyles.map((style, i) => (
                        <span key={i} style={{
                          fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase",
                          letterSpacing: "0.04em", padding: "5px 12px",
                          background: `${STYLE_COLORS[style] ?? "var(--accent)"}18`,
                          color: STYLE_COLORS[style] ?? "var(--accent)",
                          border: `1px solid ${STYLE_COLORS[style] ?? "var(--accent)"}40`
                        }}>{style}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Insights grid */}
          {insights.length > 0 && (
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "14px" }}>
                INSIGHTS ({insights.length})
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
                {insights.map(insight => (
                  <div key={insight.id} style={{
                    padding: "18px", background: "var(--bg-surface)", border: "1px solid var(--border)",
                    borderTop: `3px solid ${INSIGHT_TYPE_COLORS[insight.type] ?? "var(--accent)"}`,
                    display: "flex", flexDirection: "column", gap: "12px"
                  }}>
                    {/* Badges */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{
                        fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                        letterSpacing: "0.05em", padding: "2px 8px",
                        background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--fg-muted)"
                      }}>{insight.platform ?? "All Platforms"}</span>
                      <span style={{
                        fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                        letterSpacing: "0.05em", padding: "2px 8px",
                        background: `${INSIGHT_TYPE_COLORS[insight.type] ?? "var(--accent)"}18`,
                        color: INSIGHT_TYPE_COLORS[insight.type] ?? "var(--accent)",
                        border: `1px solid ${INSIGHT_TYPE_COLORS[insight.type] ?? "var(--accent)"}40`
                      }}>{insight.type.replace(/_/g, " ")}</span>
                    </div>

                    {/* Title */}
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em", color: "var(--fg)", lineHeight: 1.3 }}>
                      {insight.title}
                    </div>

                    {/* Description */}
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--fg-muted)", margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>
                      {insight.description}
                    </p>

                    {/* Confidence bar */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)" }}>Confidence</span>
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: confidenceColor(insight.confidence) }}>
                          {(insight.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ height: "4px", background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                        <div style={{
                          height: "100%",
                          width: `${insight.confidence * 100}%`,
                          background: confidenceColor(insight.confidence)
                        }} />
                      </div>
                    </div>

                    {/* Data points */}
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)" }}>
                      {insight.dataPoints} data points
                    </div>

                    {/* Recommendation */}
                    {insight.recommendation && (
                      <div style={{
                        padding: "10px 12px",
                        background: `${INSIGHT_TYPE_COLORS[insight.type] ?? "var(--accent)"}10`,
                        border: `1px solid ${INSIGHT_TYPE_COLORS[insight.type] ?? "var(--accent)"}30`
                      }}>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em", color: INSIGHT_TYPE_COLORS[insight.type] ?? "var(--accent)", marginBottom: "4px" }}>RECOMMENDATION</div>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--fg)", margin: 0, lineHeight: 1.5 }}>{insight.recommendation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!profile && !analyzing && insights.length === 0 && (
            <div className="panel" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px", gap: "16px" }}>
              <p className="lede">No learning data for this brand yet. Run an analysis to get started.</p>
              <button type="button" className="btn-vox btn-vox-primary" onClick={() => void analyzeNow()}>
                Analyze Now <span className="arrow">-&gt;</span>
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
