"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type MediaAsset = {
  id: string;
  brandId: string;
  type: string;
  status: string;
  url: string | null;
  thumbnailUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  altText: string | null;
  prompt: string | null;
  tags: string[];
  createdAt: string;
};

type Brand = { id: string; name: string };

const typeIcons: Record<string, string> = {
  IMAGE: "\u{1F5BC}",
  VIDEO: "\u{1F3AC}",
  AUDIO: "\u{1F50A}",
  DOCUMENT: "\u{1F4C4}",
  FACE_SWAP: "\u{1F9CD}",
  VIDEO_FACE_SWAP: "\u{1F3AC}",
  OTHER: "\u{1F4C1}",
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

export function MediaClient() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filterType, setFilterType] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ brandId: "", url: "", fileName: "", mimeType: "" });
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const workspaceId = getWorkspaceId();

  async function loadData() {
    try {
      const [assetsRes, brandsRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/media-assets`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`)),
      ]);
      if (assetsRes.ok) setAssets(await assetsRes.json());
      if (brandsRes.ok) setBrands(await brandsRes.json());
    } catch {
      setStatus("Failed to load data");
    }
  }

  useEffect(() => { void loadData(); }, []);

  const filtered = assets.filter((a) => {
    if (filterType && a.type !== filterType) return false;
    if (filterBrand && a.brandId !== filterBrand) return false;
    return true;
  });

  async function uploadAsset() {
    setUploading(true);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/upload/url`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(uploadForm),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("Asset uploaded!");
      setUploadForm({ brandId: uploadForm.brandId, url: "", fileName: "", mimeType: "" });
      setShowUpload(false);
      await loadData();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="dashboard-grid" aria-label="Media library">
      <div className="panel panel-medium">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2>Filters</h2>
          <button className="btn-vox btn-vox-secondary" style={{ fontSize: "12px", padding: "6px 14px" }} onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? "Cancel" : "+ Upload URL"}
          </button>
        </div>

        {showUpload && (
          <form className="studio-form" onSubmit={(e) => { e.preventDefault(); void uploadAsset(); }} style={{ marginBottom: "16px", padding: "16px", background: "var(--bg-surface)", borderRadius: "8px" }}>
            <div className="field">
              <label>Brand</label>
              <select value={uploadForm.brandId} onChange={(e) => setUploadForm({ ...uploadForm, brandId: e.target.value })} required>
                <option value="">Select brand</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Media URL</label>
              <input value={uploadForm.url} onChange={(e) => setUploadForm({ ...uploadForm, url: e.target.value })} placeholder="https://example.com/image.jpg" required />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="field">
                <label>File name (optional)</label>
                <input value={uploadForm.fileName} onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.value })} placeholder="brand-hero.jpg" />
              </div>
              <div className="field">
                <label>MIME type (optional)</label>
                <select value={uploadForm.mimeType} onChange={(e) => setUploadForm({ ...uploadForm, mimeType: e.target.value })}>
                  <option value="">Auto-detect</option>
                  <option value="image/jpeg">image/jpeg</option>
                  <option value="image/png">image/png</option>
                  <option value="image/webp">image/webp</option>
                  <option value="video/mp4">video/mp4</option>
                  <option value="audio/mpeg">audio/mpeg</option>
                  <option value="application/pdf">application/pdf</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-vox btn-vox-primary" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload from URL"}
            </button>
          </form>
        )}

        <div className="field">
          <label>Type</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All types</option>
            <option value="IMAGE">Images</option>
            <option value="VIDEO">Videos</option>
            <option value="AUDIO">Audio</option>
            <option value="DOCUMENT">Documents</option>
            <option value="FACE_SWAP">Face Swaps</option>
            <option value="VIDEO_FACE_SWAP">Video Face Swaps</option>
          </select>
        </div>
        <div className="field">
          <label>Brand</label>
          <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
            <option value="">All brands</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <p className="lede">{filtered.length} of {assets.length} assets</p>
        {status && <p className="lede" style={{ marginTop: "8px" }}>{status}</p>}
      </div>

      <div className="panel panel-large">
        <h2>Media Assets</h2>
        {filtered.length === 0 ? (
          <p className="lede">No media assets found. Upload an image or video URL to get started.</p>
        ) : (
          <div className="result-grid">
            {filtered.map((asset) => (
              <article key={asset.id} className="result-card">
                {asset.url && (asset.type === "IMAGE" || asset.type === "FACE_SWAP") && (
                  <img src={asset.thumbnailUrl || asset.url} alt={asset.altText ?? ""} style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "8px 8px 0 0" }} />
                )}
                {asset.url && asset.type === "VIDEO" && (
                  <video src={asset.url} style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "8px 8px 0 0" }} />
                )}
                {(!asset.url || (asset.type !== "IMAGE" && asset.type !== "VIDEO" && asset.type !== "FACE_SWAP")) && (
                  <div style={{ width: "100%", height: "80px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", background: "var(--bg-surface)", borderRadius: "8px 8px 0 0" }}>
                    {typeIcons[asset.type] ?? "\u{1F4C1}"}
                  </div>
                )}
                <div style={{ padding: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <small style={{ fontWeight: 600 }}>{asset.fileName || "Untitled"}</small>
                    <span className={`post-status status-${asset.status.toLowerCase()}`} style={{ fontSize: "10px" }}>{asset.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "10px", color: "var(--fg-muted)", marginTop: "4px" }}>
                    <span>{asset.type}</span>
                    {asset.width && asset.height && <span>{asset.width}x{asset.height}</span>}
                    {formatSize(asset.fileSize) && <span>{formatSize(asset.fileSize)}</span>}
                    {asset.duration && <span>{asset.duration}s</span>}
                  </div>
                  {asset.prompt && <p className="lede" style={{ fontSize: "10px", marginTop: "4px" }}>{asset.prompt.slice(0, 80)}</p>}
                  {asset.tags.length > 0 && (
                    <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", marginTop: "4px" }}>
                      {asset.tags.map((t) => <span key={t} style={{ fontSize: "9px", padding: "1px 5px", background: "var(--accent-soft)", borderRadius: "4px", color: "var(--accent)" }}>{t}</span>)}
                    </div>
                  )}
                  <small style={{ color: "var(--fg-muted)", display: "block", fontSize: "10px", marginTop: "4px" }}>
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </small>
                  {asset.url && (
                    <a href={asset.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "10px", color: "var(--accent)" }}>Open</a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
