"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Brand = { id: string; name: string };

type AuditResult = {
  workspaceId: string;
  brandId: string;
  scannedAccounts: number;
  profiles: Array<{
    platform: string;
    username: string;
    displayName: string;
    followerCount: number;
    followingCount: number;
    postCount: number;
    recentPosts: Array<{ id: string; caption: string; hashtags: string[]; likes: number; comments: number; shares: number; mediaUrls: string[]; postedAt: string }>;
  }>;
  insightsCreated: number;
  insights: string[];
  completedAt: string;
};

export function AuditClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  useEffect(() => {
    fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`))
      .then(r => r.ok ? r.json() : [])
      .then((b: Brand[]) => { setBrands(b); if (b[0]) setSelectedBrandId(b[0].id); })
      .catch(() => {});
  }, [workspaceId]);

  async function runAudit() {
    if (!selectedBrandId) { setStatus("Select a brand first."); return; }
    setRunning(true); setStatus("Running brand audit..."); setResult(null);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands/${selectedBrandId}/audit`), { method: "POST" });
      if (!res.ok) throw new Error("API error");
      setResult(await res.json());
      setStatus("Audit complete.");
    } catch (e: any) { setStatus(e.message ?? "Audit failed."); }
    finally { setRunning(false); }
  }

  const brandName = brands.find(b => b.id === selectedBrandId)?.name ?? "";

  return (
    <section className="dashboard-grid">
      <div className="panel panel-medium">
        <h2>Brand Audit</h2>
        {status && <div style={{ padding: "12px 16px", marginBottom: "16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontSize: "13px", color: "var(--accent)" }}>{status}</div>}

        <div className="field">
          <label>Brand</label>
          <select value={selectedBrandId} onChange={e => setSelectedBrandId(e.target.value)}>
            <option value="">Select brand</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <button type="button" className="btn-vox btn-vox-primary" disabled={running || !selectedBrandId} onClick={() => void runAudit()}>
          {running ? "Running Audit..." : "Run Audit"} <span className="arrow">&gt;</span>
        </button>

        {result && (
          <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
            <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)", display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div><strong style={{ fontSize: "24px" }}>{result.scannedAccounts}</strong><span style={{ fontSize: "12px", color: "var(--fg-muted)", marginLeft: "6px" }}>accounts scanned</span></div>
              <div><strong style={{ fontSize: "24px" }}>{result.insightsCreated}</strong><span style={{ fontSize: "12px", color: "var(--fg-muted)", marginLeft: "6px" }}>insights created</span></div>
            </div>

            {result.profiles.map((p, i) => (
              <div key={i} style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <strong style={{ textTransform: "capitalize" }}>{p.platform}</strong>
                  <span style={{ fontSize: "12px", color: "var(--fg-muted)" }}>@{p.username} · {p.followerCount.toLocaleString()} followers</span>
                </div>
                <p className="lede" style={{ fontSize: "12px", margin: 0 }}>{p.displayName}</p>
                {p.recentPosts.length > 0 && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--fg-muted)" }}>
                    <span>{p.recentPosts.length} recent posts</span>
                    <span style={{ marginLeft: "12px" }}>❤️ {p.recentPosts.reduce((s, r) => s + r.likes, 0)} total likes</span>
                    <span style={{ marginLeft: "12px" }}>💬 {p.recentPosts.reduce((s, r) => s + r.comments, 0)} total comments</span>
                  </div>
                )}
              </div>
            ))}

            {result.insights.length > 0 && (
              <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Insights</h3>
                <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "var(--fg-muted)", lineHeight: 2 }}>
                  {result.insights.map((ins, i) => <li key={i}>{ins}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel panel-large">
        <h2>About Brand Audits</h2>
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>What Gets Audited</h3>
            <p className="lede">Scans all connected social accounts for the selected brand. Analyzes follower counts, posting frequency, engagement metrics, and recent content to generate actionable brand insights.</p>
          </div>
          <div style={{ padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>Requirements</h3>
            <ul className="lede" style={{ margin: 0, paddingLeft: "16px", lineHeight: 2 }}>
              <li>Brand must exist in Brand Memory</li>
              <li>At least one connected social account (Integrations)</li>
              <li>Accounts with valid access tokens will be scanned</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
