import { BrandMemoryClient } from "./brand-memory-client";

export default function BrandsPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Brand Intelligence</p>
          <h1>Brand Memory</h1>
          <p className="lede">Manage brand profiles, tone, content pillars, and retrieval-ready memory.</p>
        </div>
      </div>
      <BrandMemoryClient />
    </>
  );
}
