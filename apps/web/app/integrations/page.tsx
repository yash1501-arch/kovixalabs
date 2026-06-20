"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getAuthHeaders, getWorkspaceId } from "../lib/client-auth";

type SocialAccount = {
  id: string;
  workspaceId: string;
  platform: string;
  handle: string;
  displayName: string;
  connected: boolean;
  connectedAt: string;
  followerCount: number;
  avatarUrl?: string;
  platformMetadata?: Record<string, any>;
};

const platforms = [
  { id: "instagram", label: "Instagram (via Facebook)", icon: "IG", color: "#E4405F", description: "Connect via Facebook Page for Business/Creator account access." },
  { id: "instagram-basic", label: "Instagram", icon: "IG", color: "#E4405F", description: "Standalone login — no Facebook Page required. Supports any personal or creator account." },
  { id: "linkedin", label: "LinkedIn", icon: "LI", color: "#0A66C2", description: "Publish thought leadership and professional content." },
  { id: "x", label: "X / Twitter", icon: "X", color: "#ffffff", description: "Post threads, updates, and engage in real-time." },
  { id: "facebook", label: "Facebook", icon: "FB", color: "#1877F2", description: "Reach broad audiences with posts and campaigns." },
  { id: "tiktok", label: "TikTok", icon: "TT", color: "#69C9D0", description: "Create short-form video content for Gen Z and beyond." },
  { id: "youtube", label: "YouTube", icon: "YT", color: "#FF0000", description: "Publish video content and grow subscriber base." }
] as const;

function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function IntegrationsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [form, setForm] = useState({ handle: "", displayName: "" });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  async function loadAccounts() {
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/social-accounts`), {
        headers: { ...getAuthHeaders() }
      });
      if (res.ok) {
        const payload = await res.json();
        setAccounts(Array.isArray(payload) ? payload : payload.accounts ?? []);
      }
    } catch {
      // silently fail — demo store may be empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("success") === "true") {
        setStatus("Channel connection authorized successfully!");
      }
      const err = searchParams.get("error");
      if (err) {
        setStatus(`Connection failed: ${err}`);
      }
    }
  }, []);

  async function connect(platform: string) {
    if (!form.handle || !form.displayName) {
      setStatus("Handle and display name are required.");
      return;
    }
    setStatus("Connecting...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/social-accounts/connect`), {
        method: "POST",
        headers: { "content-type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ platform, handle: form.handle, displayName: form.displayName })
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const account: SocialAccount = await res.json();
      setAccounts(prev => {
        const filtered = prev.filter(a => a.platform !== platform);
        return [...filtered, account];
      });
      setConnecting(null);
      setForm({ handle: "", displayName: "" });
      setStatus(`${platforms.find(p => p.id === platform)?.label} connected successfully.`);
    } catch {
      setStatus("Connection failed. Please try again.");
    }
  }

  async function disconnect(accountId: string, platform: string) {
    setStatus("Disconnecting...");
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/social-accounts/${accountId}`), {
        method: "DELETE",
        headers: { ...getAuthHeaders() }
      });
      setAccounts(prev => prev.filter(a => a.id !== accountId));
      setStatus(`${platforms.find(p => p.id === platform)?.label} disconnected.`);
    } catch {
      setStatus("Disconnect failed.");
    }
  }

  const [auditData, setAuditData] = useState<any>(null);
  const [auditing, setAuditing] = useState<string | null>(null);

  async function loadAudit(accountId: string) {
    setAuditing(accountId);
    setStatus("");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/social-accounts/${accountId}/audit`), {
        headers: { ...getAuthHeaders() }
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setAuditData(await res.json());
    } catch {
      setStatus("Failed to load profile audit details.");
    } finally {
      setAuditing(null);
    }
  }

  const connectedCount = accounts.filter(a => a.connected).length;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Platform Channels</p>
          <h1>Social Integrations</h1>
          <p className="lede">Connect your brand channels to enable scheduling and publishing.</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: "32px", fontWeight: 800, color: "var(--fg)" }}>{connectedCount}</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)" }}>Connected</div>
        </div>
      </div>

      {status && (
        <div style={{ marginBottom: "20px", padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontFamily: "var(--font-heading)", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>
          {status}
        </div>
      )}

      <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
        {platforms.map(platform => {
          const account = accounts.find(a => a.platform === platform.id);
          const isConnected = Boolean(account?.connected);
          const isExpanded = connecting === platform.id;

          return (
            <div
              key={platform.id}
              className="panel"
              style={{ transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "8px",
                    background: isConnected && account?.avatarUrl ? `url(${account.avatarUrl}) center/cover no-repeat` : `${platform.color}18`,
                    border: `1px solid ${platform.color}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 800,
                    fontSize: "14px",
                    color: platform.color,
                    letterSpacing: "-0.02em"
                  }}>
                    {!(isConnected && account?.avatarUrl) && platform.icon}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "15px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--fg)" }}>
                      {platform.label}
                    </div>
                    {isConnected && account && (
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--fg-muted)", fontStyle: "italic" }}>
                        @{account.handle} · {formatFollowers(account.followerCount)} followers
                        {platform.id === "facebook" && account.platformMetadata?.connectedVia === "instagram_oauth" && (
                          <div style={{ fontSize: "11px", color: "#10B981", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px", fontStyle: "normal" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", display: "inline-block" }}></span>
                            Auto-connected via Instagram
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`status ${isConnected ? "ready" : "next"}`}>
                  {isConnected ? "Connected" : "Not connected"}
                </span>
              </div>

              <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg-muted)", lineHeight: "1.5", marginBottom: "16px", fontStyle: "italic" }}>
                {platform.description}
              </p>

              {isConnected && account ? (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="btn-vox btn-vox-primary"
                    style={{ fontSize: "13px", padding: "8px 18px" }}
                    onClick={() => void loadAudit(account.id)}
                    type="button"
                    disabled={auditing === account.id}
                  >
                    {auditing === account.id ? "Auditing..." : "Audit Profile"}
                  </button>
                  <button
                    className="btn-vox btn-vox-secondary"
                    style={{ fontSize: "13px", padding: "8px 18px" }}
                    onClick={() => void disconnect(account.id, platform.id)}
                    type="button"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  className="btn-vox btn-vox-primary"
                  style={{ fontSize: "13px", padding: "8px 18px" }}
                  onClick={() => { window.location.href = apiUrl(`/v1/auth/platforms/${platform.id}/connect?workspaceId=${workspaceId}`); }}
                  type="button"
                  disabled={loading}
                >
                  Connect <span className="arrow">-&gt;</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {auditData && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(5, 5, 5, 0.85)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div className="panel" style={{
            width: "100%",
            maxWidth: "600px",
            background: "#111",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "36px",
            position: "relative",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)"
          }}>
            <button
              onClick={() => setAuditData(null)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "none",
                border: "none",
                color: "var(--fg-muted)",
                fontSize: "24px",
                cursor: "pointer"
              }}
              aria-label="Close modal"
              type="button"
            >
              &times;
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "8px",
                background: accounts.find(a => a.platform === auditData.platform)?.avatarUrl ? `url(${accounts.find(a => a.platform === auditData.platform)?.avatarUrl}) center/cover no-repeat` : "var(--accent-soft)",
                border: "1px solid var(--border)",
              }} />
              <div>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0, color: "var(--fg)" }}>
                  {platforms.find(p => p.id === auditData.platform)?.label} Profile Audit
                </h2>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--fg-muted)", margin: 0 }}>
                  Analysis complete · {new Date(auditData.auditedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", marginBottom: "32px", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  border: "6px solid var(--border)",
                  borderTopColor: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative"
                }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: "28px", fontWeight: 800, color: "var(--fg)" }}>
                    {auditData.score}
                  </span>
                </div>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)", marginTop: "8px" }}>
                  Quality Score
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", border: "1px solid var(--border)", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-heading)" }}>Followers</div>
                  <strong style={{ fontSize: "18px", color: "var(--fg)", fontFamily: "var(--font-heading)" }}>{formatFollowers(auditData.metrics.followers)}</strong>
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", border: "1px solid var(--border)", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-heading)" }}>Engagement</div>
                  <strong style={{ fontSize: "18px", color: "var(--fg)", fontFamily: "var(--font-heading)" }}>{auditData.metrics.avgEngagementRate}%</strong>
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", border: "1px solid var(--border)", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-heading)" }}>Audit Posts</div>
                  <strong style={{ fontSize: "18px", color: "var(--fg)", fontFamily: "var(--font-heading)" }}>{auditData.metrics.postsCount}</strong>
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", border: "1px solid var(--border)", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-heading)" }}>Frequency</div>
                  <strong style={{ fontSize: "14px", color: "var(--fg)", fontFamily: "var(--font-heading)" }}>{auditData.metrics.postFrequency}</strong>
                </div>
              </div>
            </div>

            {/* Profile Details Block */}
            {(() => {
              const details = auditData.profileDetails || {};
              const bioText = details.biography || details.about;
              const websiteUrl = details.website;
              const category = details.category;
              const followsCount = details.followsCount;
              const mediaCount = details.mediaCount;
              const pageUrl = details.pageUrl;

              if (!bioText && !websiteUrl && !category && followsCount === undefined && mediaCount === undefined) {
                return null;
              }

              return (
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "20px",
                  marginBottom: "28px"
                }}>
                  <h4 style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--fg-muted)",
                    margin: "0 0 12px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    paddingBottom: "8px"
                  }}>
                    Profile Details
                  </h4>
                  {bioText && (
                    <p style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "14px",
                      color: "var(--fg-subtle)",
                      lineHeight: "1.5",
                      margin: "0 0 16px 0",
                      whiteSpace: "pre-wrap"
                    }}>
                      {bioText}
                    </p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px", fontFamily: "var(--font-body)" }}>
                    {category && (
                      <span style={{ color: "var(--fg-muted)" }}>
                        Category: <strong style={{ color: "var(--fg)" }}>{category}</strong>
                      </span>
                    )}
                    {websiteUrl && (
                      <span style={{ color: "var(--fg-muted)" }}>
                        Website: <a href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>{websiteUrl}</a>
                      </span>
                    )}
                    {pageUrl && (
                      <span style={{ color: "var(--fg-muted)" }}>
                        Facebook Page: <a href={pageUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Visit Page</a>
                      </span>
                    )}
                    {followsCount !== undefined && followsCount > 0 && (
                      <span style={{ color: "var(--fg-muted)" }}>
                        Following: <strong style={{ color: "var(--fg)" }}>{followsCount.toLocaleString()}</strong>
                      </span>
                    )}
                    {mediaCount !== undefined && mediaCount > 0 && (
                      <span style={{ color: "var(--fg-muted)" }}>
                        Total Posts: <strong style={{ color: "var(--fg)" }}>{mediaCount.toLocaleString()}</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Ecosystem Insights (Last 28 Days) */}
            {(() => {
              const details = auditData.profileDetails || {};
              const hasIgInsights = auditData.platform === "instagram" && (details.reach28d !== undefined || details.impressions28d !== undefined || details.profileViews28d !== undefined);
              const hasFbInsights = auditData.platform === "facebook" && (details.engagedUsers28d !== undefined || details.impressions28d !== undefined || details.postEngagements28d !== undefined);

              if (!hasIgInsights && !hasFbInsights) return null;

              return (
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "20px",
                  marginBottom: "28px"
                }}>
                  <h4 style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--fg-muted)",
                    margin: "0 0 16px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    paddingBottom: "8px"
                  }}>
                    Ecosystem Insights (Last 28 Days)
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
                    {hasIgInsights && (
                      <>
                        {details.reach28d !== undefined && (
                          <div style={{ padding: "12px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px" }}>
                            <div style={{ fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Reach</div>
                            <strong style={{ fontSize: "16px", color: "var(--fg)", fontFamily: "var(--font-heading)" }}>{details.reach28d.toLocaleString()}</strong>
                          </div>
                        )}
                        {details.impressions28d !== undefined && (
                          <div style={{ padding: "12px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px" }}>
                            <div style={{ fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Impressions</div>
                            <strong style={{ fontSize: "16px", color: "var(--fg)", fontFamily: "var(--font-heading)" }}>{details.impressions28d.toLocaleString()}</strong>
                          </div>
                        )}
                        {details.profileViews28d !== undefined && (
                          <div style={{ padding: "12px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px" }}>
                            <div style={{ fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Profile Views</div>
                            <strong style={{ fontSize: "16px", color: "var(--fg)", fontFamily: "var(--font-heading)" }}>{details.profileViews28d.toLocaleString()}</strong>
                          </div>
                        )}
                      </>
                    )}
                    {hasFbInsights && (
                      <>
                        {details.engagedUsers28d !== undefined && (
                          <div style={{ padding: "12px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px" }}>
                            <div style={{ fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Engaged Users</div>
                            <strong style={{ fontSize: "16px", color: "var(--fg)", fontFamily: "var(--font-heading)" }}>{details.engagedUsers28d.toLocaleString()}</strong>
                          </div>
                        )}
                        {details.impressions28d !== undefined && (
                          <div style={{ padding: "12px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px" }}>
                            <div style={{ fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Page Impressions</div>
                            <strong style={{ fontSize: "16px", color: "var(--fg)", fontFamily: "var(--font-heading)" }}>{details.impressions28d.toLocaleString()}</strong>
                          </div>
                        )}
                        {details.postEngagements28d !== undefined && (
                          <div style={{ padding: "12px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px" }}>
                            <div style={{ fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Post Engagements</div>
                            <strong style={{ fontSize: "16px", color: "var(--fg)", fontFamily: "var(--font-heading)" }}>{details.postEngagements28d.toLocaleString()}</strong>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            <div style={{ display: "grid", gap: "20px", marginBottom: "32px" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#10B981", marginBottom: "10px", borderBottom: "1px solid rgba(16,185,129,0.2)", paddingBottom: "6px" }}>
                  Profile Strengths
                </h3>
                <ul style={{ margin: 0, paddingLeft: "16px", display: "grid", gap: "8px" }}>
                  {auditData.strengths.map((str: string, i: number) => (
                    <li key={i} style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg-subtle)", lineHeight: "1.4" }}>
                      {str}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: "10px", borderBottom: "1px solid rgba(236,0,47,0.2)", paddingBottom: "6px" }}>
                  Actionable Recommendations
                </h3>
                <ul style={{ margin: 0, paddingLeft: "16px", display: "grid", gap: "8px" }}>
                  {auditData.opportunities.map((opp: string, i: number) => (
                    <li key={i} style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg-subtle)", lineHeight: "1.4" }}>
                      {opp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <a href="/learning" className="btn-vox btn-vox-primary" style={{ fontSize: "13px", padding: "10px 20px" }}>
                Optimize Tone & pillars <span className="arrow">-&gt;</span>
              </a>
              <button
                onClick={() => setAuditData(null)}
                className="btn-vox btn-vox-secondary"
                style={{ fontSize: "13px", padding: "10px 20px" }}
                type="button"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
