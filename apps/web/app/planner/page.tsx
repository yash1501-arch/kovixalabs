import { PlannerClient } from "./planner-client";

export default function PlannerPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Content Strategy</p>
          <h1>Content Planner</h1>
          <p className="lede">Plan, schedule, and approve campaign content across all platforms in one view.</p>
        </div>
      </div>
      <PlannerClient />
    </>
  );
}
