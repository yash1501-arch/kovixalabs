import { AnalyticsClient } from "./analytics-client";

export default function AnalyticsPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Learning Loop</p>
          <h1>Analytics</h1>
          <p className="lede">Post performance, reach, and engagement signals across all connected channels.</p>
        </div>
      </div>
      <AnalyticsClient />
    </>
  );
}

