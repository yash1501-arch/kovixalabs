import { FinetuneClient } from "./finetune-client";

export default function FinetunePage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Model Training</p>
          <h1>Fine Tuning</h1>
          <p className="lede">Manage datasets, training jobs, and fine-tuned models for your brand voice.</p>
        </div>
      </div>
      <FinetuneClient />
    </>
  );
}
