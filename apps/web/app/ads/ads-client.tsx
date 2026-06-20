"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type AdVariant = {
  id: string;
  campaignId: string;
  headline: string;
  body: string;
  cta: string;
  imageStyle: string;
  estimatedCtr: string;
};

type Campaign = {
  id: string;
  workspaceId: string;
  brandId: string;
  platform: string;
  objective: string;
  status: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  targetAudience: string;
  durationDays: number;
  variants: AdVariant[];
  createdAt: string;
  updatedAt: string;
};

type Brand = { id: string; name: string };

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X (Twitter)" }
];

const OBJECTIVES = [
  { value: "awareness", label: "Brand Awareness" },
  { value: "traffic", label: "Website Traffic" },
  { value: "engagement", label: "Engagement" },
  { value: "leads", label: "Lead Generation" },
  { value: "sales", label: "Sales" }
];

const STATUS_COLORS: Record<string, string> = {
  active: "#10B981",
  paused: "#F59E0B",
  draft: "#6B7280",
  completed: "var(--accent)"
};

const OBJECTIVE_COLORS: Record<string, string> = {
  awareness: "#8B5CF6",
  traffic: "#3B82F6",
  engagement: "#F59E0B",
  leads: "#10B981",
  sales: "var(--accent)"
};

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

const defaultForm = {
  brandId: "",
  platform: "instagram",
  objective: "awareness",
  budget: 100,
  durationDays: 30,
  targetAudience: ""
};

export function AdsEngineClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  async function loadData() {
    try {
      const [campaignsRes, brandsRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/campaigns`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`))
      ]);
      if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
      if (brandsRes.ok) {
        const b: Brand[] = await brandsRes.json();
        setBrands(b);
        const first = b[0];
        if (first) setForm(f => ({ ...f, brandId: first.id }));
      }
    } catch { /* silently fail */ }
  }

  useEffect(() => { void loadData(); }, []);

  async function createCampaign() {
    if (!form.brandId || !form.targetAudience) { setStatus("Brand and target audience are required."); return; }
    setCreating(true);
    setStatus("Creating campaign...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/campaigns`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, budget: Number(form.budget), durationDays: Number(form.durationDays) })
      });
      if (!res.ok) throw new Error("API error");
      const campaign: Campaign = await res.json();
      setCampaigns(prev => [campaign, ...prev]);
      setSelectedCampaign(campaign);
      setShowForm(false);
      setStatus(`Campaign created successfully.`);
    } catch { setStatus("Failed to create campaign."); }
    finally { setCreating(false); }
  }

  async function toggleStatus(campaign: Campaign) {
    const nextStatus = campaign.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/campaigns/${campaign.id}`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const updated: Campaign = await res.json();
        setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
        if (selectedCampaign?.id === updated.id) setSelectedCampaign(updated);
      }
    } catch { /* silently fail */ }
  }

  async function deleteCampaign(id: string) {
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/campaigns/${id}`), { method: "DELETE" });
      setCampaigns(prev => prev.filter(c => c.id !== id));
      if (selectedCampaign?.id === id) setSelectedCampaign(null);
    } catch { /* silently fail */ }
  }

  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;

  return (
    <>
      {/* Metrics row */}
      <div className="metric-row" style={{ marginBottom: "24px" }}>
        <div className="metric"><span>Total Campaigns</span><strong>{campaigns.length}</strong></div>
        <div className="metric"><span>Active</span><strong style={{ color: "#10B981" }}>{activeCampaigns}</strong></div>
        <div className="metric"><span>Total Impressions</span><strong>{formatNum(totalImpressions)}</strong></div>
        <div className="metric"><span>Total Clicks</span><strong style={{ color: "var(--accent)" }}>{formatNum(totalClicks)}</strong></div>
      </div>

      {status && (
        <div style={{ marginBottom: "20px", padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontFamily: "var(--font-heading)", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>
          {status}
        </div>
      )}

      {/* New Campaign form */}
      {showForm && (
        <div className="panel" style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>New Campaign</h2>
            <button type="button" className="btn-vox btn-vox-secondary" style={{ fontSize: "11px", padding: "5px 12px" }} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
            <div className="field">
              <label>Brand</label>
              <select value={form.brandId} onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))}>
                <option value="">Select brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Platform</label>
              <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Objective</label>
              <select value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}>
                {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Budget ($)</label>
              <input type="number" min={10} value={form.budget} onChange={e => setForm(f => ({ ...f, budget: Number(e.target.value) }))} />
            </div>
            <div className="field">
              <label>Duration (days)</label>
              <input type="number" min={1} max={90} value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: Number(e.target.value) }))} />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Target Audience</label>
              <textarea
                rows={3}
                value={form.targetAudience}
                onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}
                placeholder="Describe your target audience: demographics, interests, behaviors..."
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg)", fontFamily: "var(--font-body)", fontSize: "15px", padding: "8px 12px", outline: "none", width: "100%", resize: "vertical" }}
              />
            </div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <button type="button" className="btn-vox btn-vox-primary" disabled={creating} onClick={() => void createCampaign()}>
              {creating ? "Creating..." : "Create Campaign"} <span className="arrow">-&gt;</span>
            </button>
          </div>
        </div>
      )}

      <section className="dashboard-grid">
        {/* Left: Campaign list */}
        <div className="panel panel-medium" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
            <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Campaigns</h2>
            <button type="button" className="btn-vox btn-vox-primary" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={() => setShowForm(f => !f)}>
              {showForm ? "Cancel" : "+ New"}
            </button>
          </div>

          {campaigns.length === 0 ? (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg-muted)", fontStyle: "italic" }}>No campaigns yet. Create your first ad campaign.</p>
          ) : (
            <div style={{ display: "grid", gap: "8px", overflowY: "auto" }}>
              {campaigns.map(campaign => (
                <div
                  key={campaign.id}
                  onClick={() => setSelectedCampaign(campaign)}
                  style={{
                    padding: "14px", cursor: "pointer",
                    background: selectedCampaign?.id === campaign.id ? "var(--bg-surface)" : "var(--bg-base)",
                    border: "1px solid var(--border)",
                    borderLeft: `3px solid ${selectedCampaign?.id === campaign.id ? "var(--accent)" : "transparent"}`,
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{
                        fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                        letterSpacing: "0.05em", padding: "2px 8px",
                        background: `${OBJECTIVE_COLORS[campaign.objective] ?? "var(--accent)"}18`,
                        color: OBJECTIVE_COLORS[campaign.objective] ?? "var(--accent)",
                        border: `1px solid ${OBJECTIVE_COLORS[campaign.objective] ?? "var(--accent)"}40`
                      }}>{campaign.objective}</span>
                      <span style={{
                        fontFamily: "var(--font-heading)", fontSize: "10px", padding: "2px 8px",
                        background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg-muted)",
                        textTransform: "uppercase"
                      }}>{campaign.platform}</span>
                    </div>
                    <span style={{
                      fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                      letterSpacing: "0.05em", padding: "2px 8px",
                      background: `${STATUS_COLORS[campaign.status] ?? "var(--fg-muted)"}18`,
                      color: STATUS_COLORS[campaign.status] ?? "var(--fg-muted)",
                      border: `1px solid ${STATUS_COLORS[campaign.status] ?? "var(--border)"}40`
                    }}>{campaign.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, color: "var(--fg)" }}>{formatNum(campaign.impressions)}</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Impr.</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, color: "var(--fg)" }}>{formatNum(campaign.clicks)}</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Clicks</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>{campaign.ctr.toFixed(2)}%</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>CTR</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, color: "var(--fg)" }}>${campaign.budget}</div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Budget</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Campaign detail */}
        <div className="panel panel-large" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {!selectedCampaign ? (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "300px", gap: "16px" }}>
              <p className="lede">Select a campaign to view details and ad variants.</p>
              <button type="button" className="btn-vox btn-vox-primary" onClick={() => setShowForm(true)}>
                Create Campaign <span className="arrow">-&gt;</span>
              </button>
            </div>
          ) : (
            <>
              {/* Campaign header */}
              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{
                      fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em",
                      padding: "4px 10px", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg-muted)"
                    }}>{selectedCampaign.platform}</span>
                    <span style={{
                      fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em",
                      padding: "4px 10px",
                      background: `${OBJECTIVE_COLORS[selectedCampaign.objective] ?? "var(--accent)"}18`,
                      color: OBJECTIVE_COLORS[selectedCampaign.objective] ?? "var(--accent)",
                      border: `1px solid ${OBJECTIVE_COLORS[selectedCampaign.objective] ?? "var(--accent)"}40`
                    }}>{selectedCampaign.objective}</span>
                    <span style={{
                      fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em",
                      padding: "4px 10px",
                      background: `${STATUS_COLORS[selectedCampaign.status] ?? "var(--fg-muted)"}18`,
                      color: STATUS_COLORS[selectedCampaign.status] ?? "var(--fg-muted)",
                      border: `1px solid ${STATUS_COLORS[selectedCampaign.status] ?? "var(--border)"}40`
                    }}>{selectedCampaign.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {(selectedCampaign.status === "active" || selectedCampaign.status === "paused") && (
                      <button
                        type="button"
                        className="btn-vox btn-vox-secondary"
                        style={{ fontSize: "11px", padding: "5px 12px" }}
                        onClick={() => void toggleStatus(selectedCampaign)}
                      >
                        {selectedCampaign.status === "active" ? "Pause" : "Resume"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void deleteCampaign(selectedCampaign.id)}
                      style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", color: "var(--fg-subtle)", background: "none", border: "none", cursor: "pointer", padding: "5px 8px" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)" }}>Budget</div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 800, color: "var(--fg)" }}>${selectedCampaign.budget}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)" }}>Spent</div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 800, color: "var(--fg)" }}>${selectedCampaign.spent.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)" }}>Duration</div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 800, color: "var(--fg)" }}>{selectedCampaign.durationDays}d</div>
                  </div>
                </div>
              </div>

              {/* Performance metrics */}
              <div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "12px" }}>PERFORMANCE</div>
                <div className="metric-row">
                  <div className="metric"><span>Impressions</span><strong>{formatNum(selectedCampaign.impressions)}</strong></div>
                  <div className="metric"><span>Clicks</span><strong>{formatNum(selectedCampaign.clicks)}</strong></div>
                  <div className="metric"><span>CTR</span><strong style={{ color: "var(--accent)" }}>{selectedCampaign.ctr.toFixed(2)}%</strong></div>
                  <div className="metric"><span>CPC</span><strong>${selectedCampaign.cpc.toFixed(2)}</strong></div>
                  <div className="metric"><span>Conversions</span><strong style={{ color: "#10B981" }}>{selectedCampaign.conversions}</strong></div>
                </div>
              </div>

              {/* Target audience */}
              {selectedCampaign.targetAudience && (
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "6px" }}>TARGET AUDIENCE</div>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg-muted)", fontStyle: "italic", margin: 0 }}>{selectedCampaign.targetAudience}</p>
                </div>
              )}

              {/* Ad Variants */}
              {selectedCampaign.variants && selectedCampaign.variants.length > 0 && (
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "12px" }}>
                    AD VARIANTS ({selectedCampaign.variants.length})
                  </div>
                  <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                    {selectedCampaign.variants.map(variant => (
                      <div key={variant.id} style={{
                        padding: "16px", background: "var(--bg-surface)", border: "1px solid var(--border)",
                        display: "flex", flexDirection: "column", gap: "10px"
                      }}>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: "15px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em", color: "var(--fg)", lineHeight: 1.2 }}>
                          {variant.headline}
                        </div>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--fg-muted)", margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>
                          {variant.body}
                        </p>
                        <div style={{ marginTop: "auto" }}>
                          <span style={{
                            display: "inline-block", fontFamily: "var(--font-heading)", fontSize: "11px",
                            textTransform: "uppercase", letterSpacing: "0.05em", padding: "6px 14px",
                            background: "var(--accent)", color: "#fff", cursor: "default"
                          }}>{variant.cta}</span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                          <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", padding: "2px 8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--fg-subtle)", textTransform: "uppercase" }}>{variant.imageStyle}</span>
                          <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: "var(--accent)", marginLeft: "auto" }}>Est. CTR: {variant.estimatedCtr}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
