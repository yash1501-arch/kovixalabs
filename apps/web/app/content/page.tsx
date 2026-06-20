import { Suspense } from "react";
import { ContentStudioClient } from "./content-studio-client";

export default function ContentPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Copy AI</p>
          <h1>Content Studio</h1>
          <p className="lede">Generate platform-ready captions, hashtags, and content variants with brand memory.</p>
        </div>
      </div>
      <Suspense fallback={<p className="lede">Loading content studio...</p>}>
        <ContentStudioClient />
      </Suspense>
    </>
  );
}
