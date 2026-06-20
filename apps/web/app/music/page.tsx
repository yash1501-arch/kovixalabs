import { MusicAIClient } from "./music-client";

export default function MusicPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">AI Creation</p>
          <h1>Music AI</h1>
          <p className="lede">Find the perfect soundtrack for your content with AI-curated music suggestions.</p>
        </div>
      </div>
      <MusicAIClient />
    </>
  );
}
