"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Brand = { id: string; name: string };

type AdVariant = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
  variants: AdVariant[];
};

const PLATFORMS = ["instagram", "linkedin", "x", "facebook", "tiktok", "youtube"] as const;
const OBJECTIVES = ["awareness", "traffic", "engagement", "leads", "sales"] as const;
const STATUS_ORDER: Record<string, number> = { draft: 0, active: 1, paused: 2, completed: 3 };
const STATUS_COLORS: Record<string, string> = {
  draft: "var(--fg-subtle)",
  active: "#10B981",
  paused: "#F59E0B",
  completed: "#3B82F6",
};

const platformLabels: Record<string, string> = {
  instagram: "Instagram", linkedin: "LinkedIn", x: "X",
  facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube",
};

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

const emptyForm = {
  brandId: "",
  platform: "instagram",
  objective: "awareness",
  budget: 500,
  durationDays: 14,
  targetAudience: "",
  adCopy: "",
};

export function CampaignsClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Campaign | null>(null);
  const workspaceId = getWorkspaceId();

  async function loadData() {
    try {
      const [campRes, brandRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/campaigns`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`)),
      ]);
      if (campRes.ok) {
        const data: Campaign[] = await campRes.json();
        setCampaigns(data);
      }
      if (brandRes.ok) {
        const b: Brand[] = await brandRes.json();
        setBrands(b);
        const first = b[0];
        if (first) setForm((f) => ({ ...f, brandId: first.id }));
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createCampaign() {
    if (!form.brandId || !form.targetAudience) {
      setStatus("Brand and target audience are required.");
      return;
    }
    setSubmitting(true);
    setStatus("");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/campaigns`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandId: form.brandId,
          platform: form.platform,
          objective: form.objective,
          budget: form.budget,
          durationDays: form.durationDays,
          targetAudience: form.targetAudience,
          adCopy: form.adCopy || undefined,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const campaign: Campaign = await res.json();
      setCampaigns((prev) => [campaign, ...prev]);
      setSelected(campaign);
      setShowForm(false);
      setStatus(`Created "${campaign.objective}" campaign.`);
    } catch {
      setStatus("Failed to create campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(campaignId: string, newStatus: string) {
    try {
      const res = await fetch(
        apiUrl(`/v1/workspaces/${workspaceId}/campaigns/${campaignId}`),
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (res.ok) {
        const updated: Campaign = await res.json();
        setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        if (selected?.id === updated.id) setSelected(updated);
      }
    } catch {
      /* silently fail */
    }
  }

  async function deleteCampaign(campaignId: string) {
    try {
      await fetch(
        apiUrl(`/v1/workspaces/${workspaceId}/campaigns/${campaignId}`),
        { method: "DELETE" }
      );
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      if (selected?.id === campaignId) setSelected(null);
    } catch {
      /* silently fail */
    }
  }

  const sorted = [...campaigns].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0)
  );

  return (
    <section className="dashboard-grid">
      {status && (
        <div
          className="panel-full"
          style={{
            gridColumn: "1 / -1",
            padding: "12px 16px",
            background: "var(--accent-soft)",
            border: "1px solid rgba(236,0,47,0.2)",
            fontSize: "13px",
            color: "var(--accent)",
          }}
        >
          {status}
        </div>
      )}

      {/* Sidebar: campaign list */}
      <div className="panel panel-medium" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "10px",
          }}
        >
          <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Campaigns</h2>
          <button
            type="button"
            className="btn-vox btn-vox-primary"
            style={{ fontSize: "12px", padding: "6px 14px" }}
            onClick={() => setShowForm((f) => !f)}
          >
            {showForm ? "Cancel" : "+ New"}
          </button>
        </div>

        {showForm && (
          <div
            style={{
              display: "grid",
              gap: "10px",
              padding: "14px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="field">
              <label>Brand</label>
              <select
                value={form.brandId}
                onChange={(e) => setForm((f) => ({ ...f, brandId: e.target.value }))}
              >
                <option value="">Select brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Platform</label>
              <select
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {platformLabels[p]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Objective</label>
              <select
                value={form.objective}
                onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
              >
                {OBJECTIVES.map((o) => (
                  <option key={o} value={o}>
                    {o.charAt(0).toUpperCase() + o.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div className="field">
                <label>Budget ($)</label>
                <input
                  type="number"
                  min={1}
                  value={form.budget}
                  onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))}
                />
              </div>
              <div className="field">
                <label>Duration (days)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={form.durationDays}
                  onChange={(e) => setForm((f) => ({ ...f, durationDays: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="field">
              <label>Target Audience</label>
              <input
                value={form.targetAudience}
                onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
                placeholder="e.g. Tech professionals, 25-45, US"
              />
            </div>
            <div className="field">
              <label>Ad Copy (optional)</label>
              <textarea
                value={form.adCopy}
                onChange={(e) => setForm((f) => ({ ...f, adCopy: e.target.value }))}
                placeholder="Main message for the ad..."
                style={{ minHeight: "60px" }}
              />
            </div>
            <button
              type="button"
              className="btn-vox btn-vox-primary"
              disabled={submitting}
              onClick={() => void createCampaign()}
            >
              {submitting ? "Creating..." : "Launch Campaign"} <span className="arrow">&gt;</span>
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div className="metric">
            <span>Active</span>
            <strong>{campaigns.filter((c) => c.status === "active").length}</strong>
          </div>
          <div className="metric">
            <span>Total</span>
            <strong>{campaigns.length}</strong>
          </div>
        </div>

        <div className="calendar-list" style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <p className="lede">Loading...</p>
          ) : sorted.length === 0 ? (
            <p className="lede" style={{ fontStyle: "italic" }}>
              No campaigns yet. Launch your first ad campaign.
            </p>
          ) : (
            sorted.map((c) => (
              <div
                key={c.id}
                className="calendar-item"
                style={{
                  cursor: "pointer",
                  borderLeftColor: selected?.id === c.id ? "var(--accent)" : undefined,
                  opacity: c.status === "completed" ? 0.5 : 1,
                }}
                onClick={() => setSelected(c)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <strong>{platformLabels[c.platform] ?? c.platform}</strong>
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "2px 8px",
                      background: `${STATUS_COLORS[c.status] ?? "var(--fg-muted)"}20`,
                      color: STATUS_COLORS[c.status] ?? "var(--fg-muted)",
                      border: `1px solid ${STATUS_COLORS[c.status] ?? "var(--border)"}40`,
                    }}
                  >
                    {c.status}
                  </span>
                </div>
                <span style={{ fontSize: "12px", color: "var(--fg-muted)", display: "block", marginTop: "4px" }}>
                  {c.objective} &middot; ${c.budget} budget
                </span>
                <span style={{ fontSize: "11px", color: "var(--fg-subtle)", display: "block" }}>
                  {c.targetAudience.slice(0, 60)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main: campaign detail */}
      <div className="panel panel-large" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {!selected ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "300px",
              gap: "16px",
            }}
          >
            <p className="lede">Select a campaign to view details.</p>
            <button
              type="button"
              className="btn-vox btn-vox-primary"
              onClick={() => setShowForm(true)}
            >
              Launch Campaign <span className="arrow">&gt;</span>
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>
                    {platformLabels[selected.platform] ?? selected.platform}
                  </h2>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg-muted)", fontStyle: "italic", marginTop: "4px" }}>
                    {selected.objective.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())} &middot;{" "}
                    {selected.targetAudience.slice(0, 80)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "4px 10px",
                      background: `${STATUS_COLORS[selected.status] ?? "var(--fg-muted)"}20`,
                      color: STATUS_COLORS[selected.status] ?? "var(--fg-muted)",
                      border: `1px solid ${STATUS_COLORS[selected.status] ?? "var(--border)"}40`,
                    }}
                  >
                    {selected.status}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                {selected.status === "draft" && (
                  <button
                    type="button"
                    className="btn-vox btn-vox-primary"
                    style={{ fontSize: "12px", padding: "6px 14px" }}
                    onClick={() => void updateStatus(selected.id, "active")}
                  >
                    Activate <span className="arrow">&gt;</span>
                  </button>
                )}
                {selected.status === "active" && (
                  <button
                    type="button"
                    className="btn-vox btn-vox-secondary"
                    style={{ fontSize: "12px", padding: "6px 14px" }}
                    onClick={() => void updateStatus(selected.id, "paused")}
                  >
                    Pause
                  </button>
                )}
                {selected.status === "paused" && (
                  <button
                    type="button"
                    className="btn-vox btn-vox-primary"
                    style={{ fontSize: "12px", padding: "6px 14px" }}
                    onClick={() => void updateStatus(selected.id, "active")}
                  >
                    Resume <span className="arrow">&gt;</span>
                  </button>
                )}
                {selected.status !== "completed" && (
                  <button
                    type="button"
                    className="btn-vox btn-vox-secondary"
                    style={{ fontSize: "12px", padding: "6px 14px" }}
                    onClick={() => void updateStatus(selected.id, "completed")}
                  >
                    Complete
                  </button>
                )}
                <span style={{ flex: 1 }} />
                <button
                  type="button"
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--fg-subtle)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 12px",
                  }}
                  onClick={() => void deleteCampaign(selected.id)}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="metric-row">
              <div className="metric">
                <span>Spent</span>
                <strong>${selected.spent.toFixed(2)}</strong>
              </div>
              <div className="metric">
                <span>Budget</span>
                <strong>${selected.budget.toFixed(2)}</strong>
              </div>
              <div className="metric">
                <span>Impressions</span>
                <strong>{formatNum(selected.impressions)}</strong>
              </div>
              <div className="metric">
                <span>Clicks</span>
                <strong>{formatNum(selected.clicks)}</strong>
              </div>
              <div className="metric">
                <span>CTR</span>
                <strong>{selected.ctr.toFixed(1)}%</strong>
              </div>
              <div className="metric">
                <span>CPC</span>
                <strong>${selected.cpc.toFixed(2)}</strong>
              </div>
              <div className="metric">
                <span>Conversions</span>
                <strong>{selected.conversions}</strong>
              </div>
            </div>

            {/* Ad Variants */}
            {selected.variants.length > 0 && (
              <div>
                <h3
                  style={{
                    fontSize: "14px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "10px",
                    marginBottom: "12px",
                  }}
                >
                  Ad Variants ({selected.variants.length})
                </h3>
                <div style={{ display: "grid", gap: "12px" }}>
                  {selected.variants.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        padding: "14px 16px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        borderLeft: "3px solid var(--accent)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <strong style={{ fontSize: "14px" }}>{v.headline}</strong>
                        <span style={{ fontSize: "11px", color: "var(--fg-muted)" }}>
                          Est. CTR: {v.estimatedCtr}
                        </span>
                      </div>
                      <p style={{ fontSize: "13px", color: "var(--fg-muted)", margin: "4px 0" }}>{v.body}</p>
                      <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "var(--fg-subtle)", marginTop: "8px" }}>
                        <span>CTA: {v.cta}</span>
                        <span>Style: {v.imageStyle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: "11px", color: "var(--fg-subtle)", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
              Created: {new Date(selected.createdAt).toLocaleString()} &middot;
              Duration: {selected.durationDays} days
            </div>
          </>
        )}
      </div>
    </section>
  );
}
