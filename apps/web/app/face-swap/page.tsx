import { FaceSwapClient } from "./face-swap-client";

export default function FaceSwapPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">AI Media</p>
          <h1>Face Swap</h1>
          <p className="lede">Swap faces in images using AI. Upload a source face and a target image.</p>
        </div>
      </div>
      <FaceSwapClient />
    </>
  );
}
