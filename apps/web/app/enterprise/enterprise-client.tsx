"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type TeamMember = {
  id: string;
  workspaceId: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  invitedAt: string;
  joinedAt: string | null;
};

type BillingInfo = {
  workspaceId: string;
  plan: string;
  status: string;
  seats: number;
  usedSeats: number;
  billingCycle: string;
  nextBillingDate: string | null;
  amountCents: number;
  currency: string;
};

type UsageInfo = {
  workspaceId: string;
  period: string;
  aiGenerations: number;
  postsScheduled: number;
  postsPublished: number;
  apiCalls: number;
  storageUsedMb: number;
  limits: {
    aiGenerations: number;
    postsScheduled: number;
    apiCalls: number;
    storageUsedMb: number;
  };
};

type AuditLog = {
  id: string;
  workspaceId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string;
  ipAddress: string;
  createdAt: string;
};

const ROLE_COLORS: Record<string, string> = {
  owner: "var(--accent)",
  admin: "#3B82F6",
  editor: "#10B981",
  viewer: "#6B7280"
};

const MEMBER_STATUS_COLORS: Record<string, string> = {
  active: "#10B981",
  invited: "#F59E0B",
  suspended: "#6B7280"
};

const ACTION_CHIP_COLORS: Record<string, string> = {
  "brand": "#3B82F6",
  "post": "#10B981",
  "campaign": "#8B5CF6",
  "team": "#F97316",
  "model": "var(--accent)",
  "settings": "#6B7280",
  "autopilot": "#0D9488",
  "finetune": "#6366F1"
};

function getActionColor(action: string): string {
  const prefix = action.split(".")[0] ?? "";
  return ACTION_CHIP_COLORS[prefix] ?? "#6B7280";
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
  }
  return email.slice(0, 2).toUpperCase();
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(s: string) {
  return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function UsageBar({ label, used, limit, unit = "" }: { label: string; used: number; limit: number; unit?: string }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color = pct > 80 ? "var(--accent)" : pct > 50 ? "#F97316" : "#10B981";
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg)" }}>{used.toLocaleString()}{unit} / {limit.toLocaleString()}{unit}</span>
      </div>
      <div style={{ height: "6px", background: "var(--bg-surface)", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s ease", borderRadius: "3px" }} />
      </div>
    </div>
  );
}

const PLAN_FEATURES = [
  { feature: "Seats", free: "1", pro: "3", team: "10", enterprise: "Unlimited" },
  { feature: "AI Generations/mo", free: "100", pro: "500", team: "1,000", enterprise: "Custom" },
  { feature: "Posts/mo", free: "50", pro: "200", team: "500", enterprise: "Unlimited" }
];

export function EnterpriseClient() {
  const [tab, setTab] = useState<"team" | "billing" | "usage" | "audit" | "settings">("team");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "editor" });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [settingsForm, setSettingsForm] = useState({ name: "My Workspace", slug: "my-workspace", timezone: "UTC" });
  const workspaceId = getWorkspaceId();

  const loadData = useCallback(async () => {
    try {
      const [membersRes, billingRes, usageRes, auditRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/team`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/billing`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/usage`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/audit-logs?limit=20`))
      ]);
      if (membersRes.ok) setMembers(await membersRes.json());
      if (billingRes.ok) setBilling(await billingRes.json());
      if (usageRes.ok) setUsage(await usageRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch { /* silently fail */ }
  }, [workspaceId]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function inviteMember() {
    if (!inviteForm.email) { setStatus("Email is required."); return; }
    setSaving(true);
    setStatus("Sending invite...");
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/team/invite`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(inviteForm)
      });
      if (!res.ok) throw new Error("API error");
      const m: TeamMember = await res.json();
      setMembers(prev => [...prev, m]);
      setShowInviteForm(false);
      setInviteForm({ email: "", role: "editor" });
      setStatus("Invite sent.");
    } catch { setStatus("Failed to send invite."); }
    finally { setSaving(false); }
  }

  async function changeRole(memberId: string, role: string) {
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/team/${memberId}`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        const updated: TeamMember = await res.json();
        setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
      }
    } catch { /* silently fail */ }
  }

  async function removeMember(memberId: string) {
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/team/${memberId}`), { method: "DELETE" });
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch { /* silently fail */ }
  }

  const tabStyle = (t: string): React.CSSProperties => ({
    fontFamily: "var(--font-heading)",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "8px 20px",
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
    color: tab === t ? "var(--fg)" : "var(--fg-muted)",
    transition: "all 0.15s ease"
  });

  return (
    <>
      {status && (
        <div style={{ marginBottom: "20px", padding: "12px 16px", background: "var(--accent-soft)", border: "1px solid rgba(236,0,47,0.2)", fontFamily: "var(--font-heading)", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)" }}>
          {status}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "24px", flexWrap: "wrap" }}>
        <button type="button" style={tabStyle("team")} onClick={() => setTab("team")}>Team</button>
        <button type="button" style={tabStyle("billing")} onClick={() => setTab("billing")}>Billing</button>
        <button type="button" style={tabStyle("usage")} onClick={() => setTab("usage")}>Usage</button>
        <button type="button" style={tabStyle("audit")} onClick={() => setTab("audit")}>Audit Log</button>
        <button type="button" style={tabStyle("settings")} onClick={() => setTab("settings")}>Settings</button>
      </div>

      {/* TEAM TAB */}
      {tab === "team" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>{members.length} members</span>
            <button type="button" className="btn-vox btn-vox-primary" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={() => setShowInviteForm(f => !f)}>
              {showInviteForm ? "Cancel" : "+ Invite Member"}
            </button>
          </div>

          {showInviteForm && (
            <div className="panel" style={{ marginBottom: "20px" }}>
              <h2 style={{ margin: "0 0 16px", borderBottom: "none", padding: 0 }}>Invite Member</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px", alignItems: "end" }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Email Address</label>
                  <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="colleague@company.com" />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Role</label>
                  <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button type="button" className="btn-vox btn-vox-primary" disabled={saving} style={{ fontSize: "12px", padding: "8px 16px" }} onClick={() => void inviteMember()}>
                  {saving ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </div>
          )}

          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            {members.length === 0 ? (
              <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg-muted)", fontStyle: "italic", padding: "20px" }}>No team members yet.</p>
            ) : (
              members.map((member, i) => (
                <div key={member.id} style={{
                  display: "flex", alignItems: "center", gap: "14px", padding: "14px 20px",
                  borderBottom: i < members.length - 1 ? "1px solid var(--border)" : "none"
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                    background: `${ROLE_COLORS[member.role] ?? "#6B7280"}22`,
                    border: `1px solid ${ROLE_COLORS[member.role] ?? "#6B7280"}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-heading)", fontSize: "12px", fontWeight: 700,
                    color: ROLE_COLORS[member.role] ?? "#6B7280", textTransform: "uppercase"
                  }}>
                    {getInitials(member.name, member.email)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "13px", fontWeight: 700, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      {member.name ?? member.email}
                    </div>
                    {member.name && (
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--fg-muted)" }}>{member.email}</div>
                    )}
                  </div>

                  {/* Role badge */}
                  {(() => {
                    const color = ROLE_COLORS[member.role] ?? "#6B7280";
                    return (
                      <span style={{
                        fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                        letterSpacing: "0.05em", padding: "2px 8px",
                        background: `${color}18`, color, border: `1px solid ${color}40`, flexShrink: 0
                      }}>{member.role}</span>
                    );
                  })()}

                  {/* Status badge */}
                  {(() => {
                    const color = MEMBER_STATUS_COLORS[member.status] ?? "#6B7280";
                    return (
                      <span style={{
                        fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                        letterSpacing: "0.05em", padding: "2px 8px",
                        background: `${color}18`, color, border: `1px solid ${color}40`, flexShrink: 0
                      }}>{member.status}</span>
                    );
                  })()}

                  {/* Role change + Remove (non-owner only) */}
                  {member.role !== "owner" && (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                      <select
                        value={member.role}
                        onChange={e => void changeRole(member.id, e.target.value)}
                        style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--fg)", padding: "4px 8px", cursor: "pointer" }}
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void removeMember(member.id)}
                        style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
                      >Remove</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* BILLING TAB */}
      {tab === "billing" && (
        <div style={{ display: "grid", gap: "20px" }}>
          {/* Plan card */}
          <div className="panel">
            {billing ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "32px", fontWeight: 900, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 1 }}>{billing.plan}</div>
                    <div style={{ marginTop: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
                      {(() => {
                        const statusColors: Record<string, string> = { active: "#10B981", trialing: "#F59E0B", cancelled: "var(--accent)", past_due: "var(--accent)" };
                        const color = statusColors[billing.status] ?? "#6B7280";
                        return (
                          <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 8px", background: `${color}18`, color, border: `1px solid ${color}40` }}>{billing.status}</span>
                        );
                      })()}
                      <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg-muted)", textTransform: "uppercase" }}>{billing.billingCycle}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "28px", fontWeight: 900, color: "var(--accent)" }}>
                      ${(billing.amountCents / 100).toFixed(0)}
                      <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--fg-muted)" }}>/{billing.billingCycle === "yearly" ? "yr" : "mo"}</span>
                    </div>
                    {billing.nextBillingDate && (
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: "var(--fg-muted)", textTransform: "uppercase" }}>Next: {formatDate(billing.nextBillingDate)}</div>
                    )}
                  </div>
                </div>

                {/* Seat usage */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Seat Usage</span>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", color: "var(--fg)" }}>{billing.usedSeats} of {billing.seats} seats used</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--bg-surface)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${billing.seats > 0 ? (billing.usedSeats / billing.seats) * 100 : 0}%`,
                      background: "#10B981", borderRadius: "3px", transition: "width 0.3s ease"
                    }} />
                  </div>
                </div>

                <button type="button" className="btn-vox btn-vox-primary">Upgrade Plan <span className="arrow">-&gt;</span></button>
              </>
            ) : (
              <p style={{ fontFamily: "var(--font-body)", color: "var(--fg-muted)", fontStyle: "italic" }}>Loading billing information...</p>
            )}
          </div>

          {/* Plan comparison */}
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>Plan Comparison</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-heading)", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px" }}>Feature</th>
                    {["Free", "Pro", "Team", "Enterprise"].map(plan => (
                      <th key={plan} style={{ textAlign: "center", padding: "10px 12px", color: plan === billing?.plan.toUpperCase() ? "var(--accent)" : "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px" }}>{plan}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLAN_FEATURES.map(row => (
                    <tr key={row.feature} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px", color: "var(--fg)", fontWeight: 600, textTransform: "uppercase", fontSize: "11px" }}>{row.feature}</td>
                      {[row.free, row.pro, row.team, row.enterprise].map((val, i) => (
                        <td key={i} style={{ textAlign: "center", padding: "10px 12px", color: "var(--fg-muted)" }}>{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* USAGE TAB */}
      {tab === "usage" && (
        <div className="panel">
          {usage ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Usage</h2>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "12px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{usage.period}</span>
              </div>
              <UsageBar label="AI Generations" used={usage.aiGenerations} limit={usage.limits.aiGenerations} />
              <UsageBar label="Posts Scheduled" used={usage.postsScheduled} limit={usage.limits.postsScheduled} />
              <UsageBar label="API Calls" used={usage.apiCalls} limit={usage.limits.apiCalls} />
              <UsageBar label="Storage" used={usage.storageUsedMb} limit={usage.limits.storageUsedMb} unit=" MB" />
            </>
          ) : (
            <p style={{ fontFamily: "var(--font-body)", color: "var(--fg-muted)", fontStyle: "italic" }}>Loading usage data...</p>
          )}
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {tab === "audit" && (
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Audit Log</h2>
          </div>
          {auditLogs.length === 0 ? (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--fg-muted)", fontStyle: "italic", padding: "20px" }}>No audit log entries.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-heading)", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Timestamp", "User", "Action", "Resource", "Details", "IP"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => {
                    const actionColor = getActionColor(log.action);
                    return (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 14px", color: "var(--fg-muted)", whiteSpace: "nowrap", fontSize: "11px" }}>{formatDateTime(log.createdAt)}</td>
                        <td style={{ padding: "10px 14px", color: "var(--fg)", fontSize: "11px", whiteSpace: "nowrap" }}>{log.userEmail}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{
                            fontFamily: "monospace", fontSize: "11px", padding: "2px 8px",
                            background: `${actionColor}18`, color: actionColor, border: `1px solid ${actionColor}40`
                          }}>{log.action}</span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "var(--fg-muted)", fontSize: "11px", whiteSpace: "nowrap" }}>{log.resource}{log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ""}</td>
                        <td style={{ padding: "10px 14px", color: "var(--fg-muted)", fontSize: "11px", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.details}</td>
                        <td style={{ padding: "10px 14px", color: "var(--fg-subtle)", fontSize: "11px", fontFamily: "monospace", whiteSpace: "nowrap" }}>{log.ipAddress}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === "settings" && (
        <div className="panel" style={{ maxWidth: "560px" }}>
          <h2 style={{ marginTop: 0 }}>Workspace Settings</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="field">
              <label>Workspace Name</label>
              <input
                type="text"
                value={settingsForm.name}
                onChange={e => setSettingsForm(f => ({ ...f, name: e.target.value }))}
                placeholder="My Workspace"
              />
            </div>
            <div className="field">
              <label>Workspace Slug</label>
              <input
                type="text"
                value={settingsForm.slug}
                onChange={e => setSettingsForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="my-workspace"
              />
            </div>
            <div className="field">
              <label>Timezone</label>
              <select value={settingsForm.timezone} onChange={e => setSettingsForm(f => ({ ...f, timezone: e.target.value }))}>
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="Asia/Singapore">Singapore (SGT)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>
            <div style={{ marginTop: "8px" }}>
              <button
                type="button"
                className="btn-vox btn-vox-primary"
                onClick={() => setStatus("Settings saved.")}
              >
                Save Settings <span className="arrow">-&gt;</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
