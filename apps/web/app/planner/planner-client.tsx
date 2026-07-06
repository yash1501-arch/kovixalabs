"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type Plan = {
  id: string; workspaceId: string; brandId: string; name: string;
  platform: string; startDate: string; endDate: string;
  postCount: number; themes: string[]; status: string;
  createdAt: string; updatedAt: string;
};

type PlanItem = {
  id: string; planId: string; day: number; platform: string;
  topic: string; caption: string; hashtags: string[];
  scheduledDate: string; status: "idea" | "approved" | "scheduled" | "published";
};

type Brand = { id: string; name: string };

const PLATFORMS = ["instagram", "linkedin", "x", "facebook", "tiktok", "youtube"] as const;

const ITEM_STATUS_COLORS: Record<string, string> = {
  idea: "var(--fg-subtle)",
  approved: "#10B981",
  scheduled: "#3B82F6",
  published: "var(--accent)"
};

const ITEM_STATUS_NEXT: Record<string, PlanItem["status"]> = {
  idea: "approved",
  approved: "scheduled",
  scheduled: "published",
  published: "idea"
};

export function PlannerClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    brandId: "", name: "", platform: "instagram",
    startDate: new Date().toISOString().split("T")[0] ?? "",
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] ?? "",
    postCount: 12,
    themes: ""
  });
  const workspaceId = getWorkspaceId();

  async function loadData() {
    try {
const [plansRes, brandsRes] = await Promise.all([
  fetch(apiUrl(`/v1/workspaces/${workspaceId}/content-plans`)),
  fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`))
]);
      if (plansRes.ok) setPlans(await plansRes.json());
      if (brandsRes.ok) {
        const b: Brand[] = await brandsRes.json();
        setBrands(b);
        const first = b[0];
        if (first) setForm(f => ({ ...f, brandId: first.id }));
      }
    } catch { /* silently fail */ }
  }

  async function loadItems(planId: string) {
    setLoadingItems(true);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/content-plans/${planId}/items`));
      if (res.ok) setPlanItems(await res.json());
    } catch { /* silently fail */ }
    finally { setLoadingItems(false); }
  }

  useEffect(() => { void loadData(); }, []);

  async function createPlan() {
    if (!form.brandId || !form.name) { setStatus("Brand and plan name are required."); return; }
    setCreating(true);
    setStatus("Generating content plan...");
    try {
      const themes = form.themes.split(",").map(t => t.trim()).filter(Boolean);
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/content-plans`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, postCount: Number(form.postCount), themes })
      });
      if (!res.ok) throw new Error("API error");
      const { plan, items }: { plan: Plan; items: PlanItem[] } = await res.json();
      setPlans(prev => [plan, ...prev]);
      setSelectedPlan(plan);
      setPlanItems(items);
      setShowForm(false);
      setStatus(`Created "${plan.name}" with ${items.length} post ideas.`);
    } catch { setStatus("Failed to create plan."); }
    finally { setCreating(false); }
  }

  async function deletePlan(planId: string) {
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/content-plans/${planId}`), { method: "DELETE" });
      setPlans(prev => prev.filter(p => p.id !== planId));
      if (selectedPlan?.id === planId) { setSelectedPlan(null); setPlanItems([]); }
    } catch { /* silently fail */ }
  }

  async function updateItemStatus(planId: string, itemId: string, currentStatus: string) {
    const nextStatus = ITEM_STATUS_NEXT[currentStatus] ?? "idea";
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/content-plans/${planId}/items/${itemId}`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const updated: PlanItem = await res.json();
        setPlanItems(prev => prev.map(i => i.id === itemId ? updated : i));
      }
    } catch { /* silently fail */ }
  }

  function selectPlan(plan: Plan) {
    setSelectedPlan(plan);
    void loadItems(plan.id);
  }

  const approvedCount = planItems.filter(i => i.status === "approved").length;
  const scheduledCount = planItems.filter(i => i.status === "scheduled" || i.status === "published").length;

  return (
    <section className="dashboard-grid">
      {/* Sidebar: plan list */}
      <div className="panel panel-medium" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
          <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Plans</h2>
          <button type="button" className="btn-vox btn-vox-primary" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={() => setShowForm(f => !f)}>
            {showForm ? "Cancel" : "+ New"}
          </button>
        </div>

        {status && (
          <p style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)", margin: 0 }}>{status}</p>
        )}

        {showForm && (
          <div style={{ display: "grid", gap: "10px", padding: "14px", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="field">
              <label>Brand</label>
              <select value={form.brandId} onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))}>
                <option value="">Select brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Plan Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Q3 LinkedIn Campaign" />
            </div>
            <div className="field">
              <label>Platform</label>
              <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div className="field">
                <label>Start</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="field">
                <label>End</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label>Posts per plan</label>
              <input type="number" min={1} max={60} value={form.postCount} onChange={e => setForm(f => ({ ...f, postCount: Number(e.target.value) }))} />
            </div>
            <div className="field">
              <label>Themes (comma-separated)</label>
              <input value={form.themes} onChange={e => setForm(f => ({ ...f, themes: e.target.value }))} placeholder="product launch, education, culture" />
            </div>
            <button type="button" className="btn-vox btn-vox-primary" disabled={creating} onClick={() => void createPlan()}>
              {creating ? "Generating..." : "Generate Plan"} <span className="arrow">-&gt;</span>
            </button>
          </div>
        )}

        <div className="calendar-list" style={{ flex: 1, overflowY: "auto" }}>
          {plans.length === 0 ? (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg-muted)", fontStyle: "italic" }}>No plans yet. Create your first campaign plan.</p>
          ) : plans.map(plan => (
            <div
              key={plan.id}
              className="calendar-item"
              style={{ cursor: "pointer", borderLeftColor: selectedPlan?.id === plan.id ? "var(--accent)" : undefined }}
              onClick={() => selectPlan(plan)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <strong>{plan.name}</strong>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); void deletePlan(plan.id); }}
                  style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", color: "var(--fg-subtle)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Delete
                </button>
              </div>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-muted)" }}>
                {plan.platform} · {plan.postCount} posts
              </span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--fg-subtle)", fontStyle: "italic" }}>
                {plan.startDate} → {plan.endDate}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main: plan items */}
      <div className="panel panel-large" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {!selectedPlan ? (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "300px", gap: "16px" }}>
            <p className="lede">Select a plan to view its content schedule.</p>
            <button type="button" className="btn-vox btn-vox-primary" onClick={() => setShowForm(true)}>
              Create First Plan <span className="arrow">-&gt;</span>
            </button>
          </div>
        ) : (
          <>
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>{selectedPlan.name}</h2>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg-muted)", fontStyle: "italic", marginTop: "4px" }}>
                    {selectedPlan.platform} · {selectedPlan.startDate} → {selectedPlan.endDate}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "16px", textAlign: "right" }}>
                  <div><div style={{ fontFamily: "var(--font-heading)", fontSize: "22px", fontWeight: 800, color: "#10B981" }}>{approvedCount}</div><div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)" }}>Approved</div></div>
                  <div><div style={{ fontFamily: "var(--font-heading)", fontSize: "22px", fontWeight: 800, color: "#3B82F6" }}>{scheduledCount}</div><div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)" }}>Scheduled</div></div>
                  <div><div style={{ fontFamily: "var(--font-heading)", fontSize: "22px", fontWeight: 800, color: "var(--fg)" }}>{planItems.length}</div><div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)" }}>Total</div></div>
                </div>
              </div>
              {selectedPlan.themes.length > 0 && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                  {selectedPlan.themes.map(theme => (
                    <span key={theme} style={{ fontFamily: "var(--font-heading)", fontSize: "11px", padding: "2px 8px", background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid rgba(236,0,47,0.2)" }}>{theme}</span>
                  ))}
                </div>
              )}
            </div>

            {loadingItems ? (
              <p className="lede">Loading content items...</p>
            ) : (
              <div style={{ display: "grid", gap: "8px", overflowY: "auto", maxHeight: "600px" }}>
                {planItems.map(item => (
                  <div key={item.id} style={{
                    display: "grid", gridTemplateColumns: "40px 1fr auto",
                    gap: "12px", alignItems: "start",
                    padding: "14px 16px",
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    borderLeft: `3px solid ${ITEM_STATUS_COLORS[item.status] ?? "var(--border)"}`,
                    transition: "all 0.2s ease"
                  }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 800, color: "var(--fg-subtle)", lineHeight: 1 }}>
                      {item.day}
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--fg)", marginBottom: "4px" }}>
                        {item.topic}
                      </div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg-muted)", fontStyle: "italic", lineHeight: 1.4, marginBottom: "6px" }}>
                        {item.caption.slice(0, 100)}{item.caption.length > 100 ? "…" : ""}
                      </div>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.scheduledDate}</span>
                        {item.hashtags.slice(0, 3).map(h => (
                          <span key={h} style={{ fontFamily: "var(--font-heading)", fontSize: "10px", padding: "1px 6px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--fg-muted)" }}>{h}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void updateItemStatus(selectedPlan.id, item.id, item.status)}
                      style={{
                        fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                        letterSpacing: "0.06em", padding: "4px 10px", cursor: "pointer",
                        background: `${ITEM_STATUS_COLORS[item.status] ?? "var(--fg-muted)"}18`,
                        color: ITEM_STATUS_COLORS[item.status] ?? "var(--fg-muted)",
                        border: `1px solid ${ITEM_STATUS_COLORS[item.status] ?? "var(--border)"}40`,
                        transition: "all 0.2s ease", whiteSpace: "nowrap"
                      }}
                    >
                      {item.status.replace(/_/g, " ")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
