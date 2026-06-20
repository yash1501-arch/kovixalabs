import { AdsEngineClient } from "./ads-client";

export default function AdsPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Performance Marketing</p>
          <h1>Ads Engine</h1>
          <p className="lede">Create and manage ad campaigns with AI-generated variants and real-time performance tracking.</p>
        </div>
      </div>
      <AdsEngineClient />
    </>
  );
}
