"use client";

import { useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

const PLATFORM_NAMES: Record<string, string> = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube" };

export function HashtagResearchClient() {
  const [tab, setTab] = useState("research");
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [hashtags, setHashtags] = useState("");
  const [industry, setIndustry] = useState("");
  const [researchResult, setResearchResult] = useState<any>(null);
  const [rechargeResult, setRechargeResult] = useState<any>(null);
  const [brandId, setBrandId] = useState("");
  const [currentHashtags, setCurrentHashtags] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  async function doResearch() {
    if (!topic) { setStatus("Topic is required."); return; }
    setLoading(true); setStatus("Researching hashtags...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/research/hashtags`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, platform, hashtags: hashtags ? hashtags.split(/[\s,]+/).filter(Boolean) : [], industry: industry || undefined, brandId: brandId || undefined }),
      });
      if (!res.ok) throw new Error("API error");
      setResearchResult(await res.json());
      setStatus("Research complete.");
    } catch { setStatus("Research failed."); }
    finally { setLoading(false); }
  }

  async function doRecharge() {
    if (!brandId) { setStatus("Brand ID is required for recharge."); return; }
    setLoading(true); setStatus("Recharging hashtags...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/research/hashtags/recharge`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId, platform, currentHashtags: currentHashtags ? currentHashtags.split(/[\s,]+/).filter(Boolean) : [], topic: topic || undefined }),
      });
      if (!res.ok) throw new Error("API error");
      setRechargeResult(await res.json());
      setStatus("Hashtag pool refreshed.");
    } catch { setStatus("Recharge failed."); }
    finally { setLoading(false); }
  }

  const tabStyle = (t: string): React.CSSProperties => ({
    fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em",
    padding: "8px 20px", cursor: "pointer", background: "none", border: "none",
    borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
    color: tab === t ? "var(--fg)" : "var(--fg-muted)", transition: "all 0.15s ease",
  });

  return (
    <section className="dashboard-grid">
      <div className="panel panel-medium">
        {status && <div style={{ padding: "12px 16px", marginBottom: "16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "13px", color: "var(--accent)" }}>{status}</div>}

        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "16px" }}>
          <button type="button" style={tabStyle("research")} onClick={() => setTab("research")}>Research</button>
          <button type="button" style={tabStyle("recharge")} onClick={() => setTab("recharge")}>Recharge</button>
        </div>

        {tab === "research" && (
          <div style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ margin: 0 }}>Hashtag Research</h2>
            <p className="lede">Analyze hashtags for volume, competition, trend direction, and get recommendations.</p>
            <div className="field"><label>Topic *</label><input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. digital marketing tips" /></div>
            <div className="field">
              <label>Platform</label><select value={platform} onChange={e => setPlatform(e.target.value)}>
                {Object.entries(PLATFORM_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field"><label>Existing Hashtags (optional)</label><input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#ai #marketing" /></div>
            <div className="field"><label>Industry (optional)</label><input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. SaaS, fashion, health" /></div>
            <button type="button" className="btn-vox btn-vox-primary" disabled={loading} onClick={() => void doResearch()}>{loading ? "..." : "Research"} <span className="arrow">&gt;</span></button>

            {researchResult && (
              <div style={{ marginTop: "12px", display: "grid", gap: "12px" }}>
                <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                  <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Recommended</h3>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {researchResult.recommended?.map((h: string) => <span key={h} style={{ fontSize: "12px", padding: "4px 10px", background: "rgba(16,185,129,0.15)", color: "#10B981", borderRadius: "4px" }}>{h}</span>)}
                  </div>
                </div>
                <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                  <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Avoid</h3>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {researchResult.avoid?.map((h: string) => <span key={h} style={{ fontSize: "12px", padding: "4px 10px", background: "rgba(236,0,47,0.12)", color: "var(--accent)", borderRadius: "4px" }}>{h}</span>)}
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "var(--fg-muted)", lineHeight: 1.6 }}>{researchResult.rationale}</div>
              </div>
            )}
          </div>
        )}

        {tab === "recharge" && (
          <div style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ margin: 0 }}>Hashtag Pool Recharge</h2>
            <p className="lede">Refresh your hashtag strategy with a new pool organized by category.</p>
            <div className="field"><label>Brand ID *</label><input value={brandId} onChange={e => setBrandId(e.target.value)} placeholder="Brand ID" /></div>
            <div className="field"><label>Platform</label><select value={platform} onChange={e => setPlatform(e.target.value)}>
              {Object.entries(PLATFORM_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
            <div className="field"><label>Current Hashtags</label><input value={currentHashtags} onChange={e => setCurrentHashtags(e.target.value)} placeholder="Separated by spaces or commas" /></div>
            <div className="field"><label>Topic (optional)</label><input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. AI tools" /></div>
            <button type="button" className="btn-vox btn-vox-primary" disabled={loading} onClick={() => void doRecharge()}>{loading ? "..." : "Recharge"} <span className="arrow">&gt;</span></button>

            {rechargeResult?.pool && (
              <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                {Object.entries(rechargeResult.pool).map(([key, tags]: [string, any]) => (
                  <div key={key} style={{ padding: "12px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                    <h3 style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px", color: "var(--fg-muted)" }}>{key}</h3>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {(tags as string[]).map((t: string) => <span key={t} style={{ fontSize: "12px", padding: "2px 8px", background: "var(--accent-soft)", borderRadius: "4px", color: "var(--accent)" }}>{t}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel panel-large">
        <h2>How It Works</h2>
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>Research</h3>
            <p className="lede">Analyzes hashtags for volume estimate, competition level, trend direction, and relevance score. Returns recommended and avoid lists with rationale.</p>
          </div>
          <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>Recharge</h3>
            <p className="lede">Generates a fresh hashtag pool organized by category (primary, secondary, niche, branded, seasonal). Also identifies deprecated hashtags to retire.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
