import { MlopsClient } from "./mlops-client";

export default function MlopsPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Infrastructure</p>
          <h1>MLOps</h1>
          <p className="lede">Model registry, deployment pipeline, and experiment tracking.</p>
        </div>
      </div>
      <MlopsClient />
    </>
  );
}
