import { TrendsClient } from "./trends-client";

export default function TrendsPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Trend Engine</p>
          <h1>Social Trends</h1>
          <p className="lede">Discover rising topics, viral signals, and brand-aligned content opportunities.</p>
        </div>
      </div>
      <TrendsClient />
    </>
  );
}
