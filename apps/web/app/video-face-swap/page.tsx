import { VideoFaceSwapClient } from "./video-face-swap-client";

export default function VideoFaceSwapPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">AI Media</p>
          <h1>Video Face Swap</h1>
          <p className="lede">Swap a face into any video. Upload a source face image and a target video.</p>
        </div>
      </div>
      <VideoFaceSwapClient />
    </>
  );
}
