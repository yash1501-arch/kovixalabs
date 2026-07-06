"use client";

import { useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

const PLATFORM_NAMES: Record<string, string> = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube" };
const CATEGORY_COLORS: Record<string, string> = { best_time: "#3B82F6", best_content: "#10B981", hashtag_performance: "#F59E0B", engagement_pattern: "#8B5CF6" };

type RecordEntry = { post_id: string; platform: string; likes: number; comments: number; shares: number; impressions: number; reach: number; saves: number; engagement_rate: number; posted_at: string };

export function EngagementClient() {
  const [brandId, setBrandId] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [form, setForm] = useState({ post_id: "", likes: "0", comments: "0", shares: "0", impressions: "0", reach: "0", saves: "0", posted_at: new Date().toISOString().slice(0, 10) });
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  function addRecord() {
    const r: RecordEntry = {
      post_id: form.post_id || `post-${Date.now()}`,
      platform,
      likes: Number(form.likes), comments: Number(form.comments), shares: Number(form.shares),
      impressions: Number(form.impressions), reach: Number(form.reach), saves: Number(form.saves),
      engagement_rate: Number(form.impressions) > 0 ? (Number(form.likes) + Number(form.comments)) / Number(form.impressions) * 100 : 0,
      posted_at: form.posted_at,
    };
    setRecords(prev => [...prev, r]);
    setForm({ post_id: "", likes: "0", comments: "0", shares: "0", impressions: "0", reach: "0", saves: "0", posted_at: new Date().toISOString().slice(0, 10) });
  }

  function removeRecord(i: number) {
    setRecords(prev => prev.filter((_, idx) => idx !== i));
  }

  async function analyze() {
    if (!brandId || records.length === 0) { setStatus("Brand ID and at least one record are required."); return; }
    setAnalyzing(true); setStatus("Analyzing engagement...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/research/engagement`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId, platform, records }),
      });
      if (!res.ok) throw new Error("API error");
      setResult(await res.json());
      setStatus("Analysis complete.");
    } catch { setStatus("Analysis failed."); }
    finally { setAnalyzing(false); }
  }

  return (
    <section className="dashboard-grid">
      <div className="panel panel-medium">
        <h2>Engagement Analysis</h2>
        {status && <div style={{ padding: "12px 16px", marginBottom: "16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "13px", color: "var(--accent)" }}>{status}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="field"><label>Brand ID</label><input value={brandId} onChange={e => setBrandId(e.target.value)} placeholder="Brand ID" /></div>
          <div className="field"><label>Platform</label><select value={platform} onChange={e => setPlatform(e.target.value)}>
            {Object.entries(PLATFORM_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        </div>

        <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)", marginTop: "12px" }}>
          <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>Add Record</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            <div className="field" style={{ margin: 0 }}><label>Post ID</label><input value={form.post_id} onChange={e => setForm(f => ({ ...f, post_id: e.target.value }))} /></div>
            <div className="field" style={{ margin: 0 }}><label>Likes</label><input type="number" min={0} value={form.likes} onChange={e => setForm(f => ({ ...f, likes: e.target.value }))} /></div>
            <div className="field" style={{ margin: 0 }}><label>Comments</label><input type="number" min={0} value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} /></div>
            <div className="field" style={{ margin: 0 }}><label>Shares</label><input type="number" min={0} value={form.shares} onChange={e => setForm(f => ({ ...f, shares: e.target.value }))} /></div>
            <div className="field" style={{ margin: 0 }}><label>Impressions</label><input type="number" min={0} value={form.impressions} onChange={e => setForm(f => ({ ...f, impressions: e.target.value }))} /></div>
            <div className="field" style={{ margin: 0 }}><label>Reach</label><input type="number" min={0} value={form.reach} onChange={e => setForm(f => ({ ...f, reach: e.target.value }))} /></div>
            <div className="field" style={{ margin: 0 }}><label>Saves</label><input type="number" min={0} value={form.saves} onChange={e => setForm(f => ({ ...f, saves: e.target.value }))} /></div>
            <div className="field" style={{ margin: 0 }}><label>Date</label><input type="date" value={form.posted_at} onChange={e => setForm(f => ({ ...f, posted_at: e.target.value }))} /></div>
          </div>
          <button type="button" style={{ fontSize: "12px", padding: "6px 14px", marginTop: "8px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg)", cursor: "pointer" }} onClick={addRecord}>+ Add Record</button>
        </div>

        {records.length > 0 && (
          <div style={{ marginTop: "12px" }}>
            <p style={{ fontSize: "12px", color: "var(--fg-muted)", marginBottom: "6px" }}>{records.length} records added</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {records.map((r, i) => (
                <span key={i} style={{ fontSize: "11px", padding: "3px 8px", background: "var(--accent-soft)", borderRadius: "4px", color: "var(--accent)", cursor: "pointer" }} onClick={() => removeRecord(i)}>
                  {r.post_id.slice(0, 12)} ✕
                </span>
              ))}
            </div>
          </div>
        )}

        <button type="button" className="btn-vox btn-vox-primary" disabled={analyzing || records.length === 0 || !brandId} onClick={() => void analyze()} style={{ marginTop: "16px", width: "100%" }}>
          {analyzing ? "Analyzing..." : "Analyze Engagement"} <span className="arrow">&gt;</span>
        </button>

        {result && (
          <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
            <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Optimal Posting Times</h3>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {result.optimal_posting_times?.map((t: string) => <span key={t} style={{ fontSize: "12px", padding: "4px 10px", background: "rgba(59,130,246,0.15)", color: "#3B82F6", borderRadius: "4px" }}>{t}</span>)}
              </div>
            </div>
            <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Top Performing Hashtags</h3>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {result.top_performing_hashtags?.map((h: string) => <span key={h} style={{ fontSize: "12px", padding: "4px 10px", background: "rgba(16,185,129,0.15)", color: "#10B981", borderRadius: "4px" }}>{h}</span>)}
              </div>
            </div>
            <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Recommended Content Mix</h3>
              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "var(--fg-muted)", lineHeight: 1.8 }}>
                {result.recommended_content_mix?.map((m: string) => <li key={m}>{m}</li>)}
              </ul>
            </div>
            <div style={{ display: "grid", gap: "8px" }}>
              {result.insights?.map((ins: any, i: number) => (
                <div key={i} style={{ padding: "12px", background: "var(--bg-surface)", border: `1px solid ${CATEGORY_COLORS[ins.category] ?? "var(--border)"}40`, borderLeft: `3px solid ${CATEGORY_COLORS[ins.category] ?? "var(--border)"}` }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: CATEGORY_COLORS[ins.category] ?? "var(--fg-muted)", marginBottom: "4px" }}>{ins.title}</div>
                  <p style={{ fontSize: "13px", margin: "0 0 4px", color: "var(--fg)" }}>{ins.detail}</p>
                  <p style={{ fontSize: "12px", margin: 0, color: "var(--fg-muted)", fontStyle: "italic" }}>{ins.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="panel panel-large">
        <h2>How It Works</h2>
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>Input</h3>
            <p className="lede">Add individual post engagement records manually. Each record captures likes, comments, shares, impressions, reach, and saves for a single post.</p>
          </div>
          <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>Output</h3>
            <p className="lede">Get AI-powered insights: best posting times, top hashtags, content mix recommendations, and categorized performance insights with confidence scores.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
