import { EnterpriseClient } from "./enterprise-client";

export default function EnterprisePage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Enterprise</h1>
          <p className="lede">Team management, billing, usage analytics, and audit logs for your workspace.</p>
        </div>
      </div>
      <EnterpriseClient />
    </>
  );
}
