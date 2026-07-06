import { VideoProjectsClient } from "./video-projects-client";

export default function VideoProjectsPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">AI Media</p>
          <h1>Video Projects</h1>
          <p className="lede">Create and manage video production projects. Generate, render, and export videos.</p>
        </div>
      </div>
      <VideoProjectsClient />
    </>
  );
}
