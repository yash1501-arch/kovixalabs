import { DashboardClient } from "./dashboard-client";

export default function DashboardPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">AISMOS Phase 1</p>
          <h1>Command Center</h1>
          <p className="lede">Your brand operations hub — monitor activity, manage content, and track performance.</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <a href="/content" className="btn-vox btn-vox-primary">
            New Content <span className="arrow">-&gt;</span>
          </a>
        </div>
      </div>
      <DashboardClient />
    </>
  );
}
