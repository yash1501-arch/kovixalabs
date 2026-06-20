import { VideoAIClient } from "./video-client";

export default function VideoPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">AI Creation</p>
          <h1>Video AI</h1>
          <p className="lede">Generate professional video scripts for any platform with AI-powered storytelling.</p>
        </div>
      </div>
      <VideoAIClient />
    </>
  );
}
