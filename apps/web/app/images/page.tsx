import { ImagesClient } from "./images-client";

export default function ImagesPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Creative AI</p>
          <h1>Image Generation</h1>
          <p className="lede">Generate brand-consistent image concepts and prompts for any platform format.</p>
        </div>
      </div>
      <ImagesClient />
    </>
  );
}
