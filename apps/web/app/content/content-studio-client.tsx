"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  BrandRecordSchema,
  CopyGenerationRequestSchema,
  CopyGenerationResponseSchema,
  type BrandRecord,
  type CopyGenerationResponse
} from "@kovixalabs/shared";
import { apiUrl } from "../lib/api";
import { getWorkspaceId, getAuthHeaders } from "../lib/client-auth";

const emptyForm = {
  brandId: "",
  platform: "linkedin",
  topic: "",
  objective: "",
  toneOverride: "",
  variants: 3
};

type CopyForm = typeof emptyForm;

type HashtagSet = {
  trending: string[];
  niche: string[];
  branded: string[];
};

export function ContentStudioClient() {
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [form, setForm] = useState<CopyForm>(emptyForm);
  const [status, setStatus] = useState("Loading brands...");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<CopyGenerationResponse | null>(null);
  const [selectedCaption, setSelectedCaption] = useState("");
  const [hashtags, setHashtags] = useState<HashtagSet | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
  const [copied, setCopied] = useState(false);
  const workspaceId = getWorkspaceId();
  const searchParams = useSearchParams();

  useEffect(() => {
    const topicParam = searchParams.get("topic");
    if (topicParam) {
      setForm((f) => ({ ...f, topic: decodeURIComponent(topicParam) }));
    }
  }, [searchParams]);

  const loadBrands = useCallback(async function loadBrands() {
    try {
      const response = await fetch(
        apiUrl(`/v1/workspaces/${workspaceId}/brands`),
        { cache: "no-store" }
      );

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const parsedBrands = BrandRecordSchema.array().parse(await response.json());
      setBrands(parsedBrands);
      setForm((current) => ({
        ...current,
        brandId: current.brandId || parsedBrands[0]?.id || ""
      }));
      setStatus(
        parsedBrands.length
          ? "Brands loaded."
          : "Create a brand memory profile first."
      );
    } catch (error) {
      setStatus(error instanceof Error ? `API unavailable: ${error.message}` : "API unavailable.");
    }
  }, [workspaceId]);

  useEffect(() => { void loadBrands(); }, [loadBrands]);

  function updateField<K extends keyof CopyForm>(field: K, value: CopyForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function generateCopy() {
    setIsGenerating(true);
    setStatus("Generating copy...");
    setResult(null);
    setHashtags(null);
    setSelectedCaption("");

    try {
      const payload = CopyGenerationRequestSchema.parse({
        brandId: form.brandId,
        platform: form.platform,
        topic: form.topic,
        objective: form.objective,
        toneOverride: form.toneOverride || undefined,
        variants: Number(form.variants)
      });

      const response = await fetch(apiUrl("/v1/ai/copy"), {
        method: "POST",
        headers: { "content-type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `API returned ${response.status}`);
      }

      const generation = CopyGenerationResponseSchema.parse(await response.json());
      setResult(generation);
      setStatus("Copy variants generated. Select one to generate hashtags.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Copy generation failed: ${error.message}`
          : "Copy generation failed."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateHashtags(caption: string) {
    if (!form.brandId || !form.topic) {
      setStatus("Select a brand and topic first.");
      return;
    }
    setIsGeneratingHashtags(true);
    setSelectedCaption(caption);
    setSelectedTags(new Set());

    try {
      const res = await fetch(apiUrl(`/v1/brands/${form.brandId}/hashtags`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandId: form.brandId,
          platform: form.platform,
          topic: form.topic,
          caption
        })
      });
      if (!res.ok) throw new Error("Hashtag API error");
      const data: HashtagSet = await res.json();
      setHashtags(data);
      setStatus("Hashtags generated. Click tags to select them.");
    } catch {
      setStatus("Hashtag generation failed.");
    } finally {
      setIsGeneratingHashtags(false);
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  async function copyTags() {
    const tagStr = [...selectedTags].join(" ");
    await navigator.clipboard.writeText(tagStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function schedulePost(caption?: string) {
    const captionToUse = caption ?? selectedCaption;
    if (captionToUse) {
      const tags = [...selectedTags].join(" ");
      sessionStorage.setItem("aismos.draft", JSON.stringify({
        caption: captionToUse,
        hashtags: tags,
        platform: form.platform,
        brandId: form.brandId
      }));
    }
    window.location.href = "/calendar";
  }

  return (
    <section className="dashboard-grid" aria-label="Content generation studio">
      {/* Generator form */}
      <div className="panel panel-large">
        <h2>Caption Generator</h2>
        <form className="studio-form">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="field">
              <label htmlFor="copy-brand">Brand</label>
              <select
                id="copy-brand"
                value={form.brandId}
                onChange={(e) => updateField("brandId", e.target.value)}
              >
                <option value="">Select a brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="copy-platform">Platform</label>
              <select
                id="copy-platform"
                value={form.platform}
                onChange={(e) => updateField("platform", e.target.value)}
              >
                <option value="linkedin">LinkedIn</option>
                <option value="instagram">Instagram</option>
                <option value="x">X / Twitter</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="copy-topic">Topic</label>
            <input
              id="copy-topic"
              value={form.topic}
              onChange={(e) => updateField("topic", e.target.value)}
              placeholder="e.g. product launch, behind the scenes, thought leadership"
            />
          </div>
          <div className="field">
            <label htmlFor="copy-objective">Objective</label>
            <textarea
              id="copy-objective"
              value={form.objective}
              onChange={(e) => updateField("objective", e.target.value)}
              placeholder="What outcome should this post drive?"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="field">
              <label htmlFor="copy-tone">Tone override</label>
              <input
                id="copy-tone"
                value={form.toneOverride}
                onChange={(e) => updateField("toneOverride", e.target.value)}
                placeholder="e.g. bold, conversational, formal"
              />
            </div>
            <div className="field">
              <label htmlFor="copy-variants">Variants</label>
              <input
                id="copy-variants"
                max={10}
                min={1}
                type="number"
                value={form.variants}
                onChange={(e) => updateField("variants", Number(e.target.value))}
              />
            </div>
          </div>
          <button
            className="btn-vox btn-vox-primary"
            disabled={isGenerating || !form.brandId}
            type="button"
            onClick={() => void generateCopy()}
            style={{ justifySelf: "start" }}
          >
            {isGenerating ? "Generating..." : "Generate Captions"} <span className="arrow">-&gt;</span>
          </button>
        </form>
      </div>

      {/* Status + hashtags panel */}
      <div className="panel panel-medium" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h2>Status</h2>
          <p className="lede">{status}</p>
        </div>

        {hashtags && (
          <div>
            <h2 style={{ fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "16px" }}>Hashtags</h2>
            {(["trending", "niche", "branded"] as const).map(group => (
              <div key={group} style={{ marginBottom: "16px" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "8px" }}>
                  {group}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {hashtags[group].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "12px",
                        padding: "4px 10px",
                        borderRadius: "4px",
                        border: `1px solid ${selectedTags.has(tag) ? "var(--accent)" : "var(--border)"}`,
                        background: selectedTags.has(tag) ? "var(--accent-soft)" : "var(--bg-surface)",
                        color: selectedTags.has(tag) ? "var(--accent)" : "var(--fg-muted)",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
              {selectedTags.size > 0 && (
                <button
                  type="button"
                  className="btn-vox btn-vox-primary"
                  style={{ fontSize: "12px", padding: "6px 14px" }}
                  onClick={() => void copyTags()}
                >
                  {copied ? "Copied!" : `Copy ${selectedTags.size} Tags`}
                </button>
              )}
              <button
                type="button"
                className="btn-vox btn-vox-secondary"
                style={{ fontSize: "12px", padding: "6px 14px" }}
                onClick={() => schedulePost()}
              >
                Schedule Post
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generated variants */}
      <div className="panel panel-full">
        <h2>Generated Variants</h2>
        {result ? (
          <div className="result-grid">
            {result.variants.map((variant) => (
              <article key={variant.id} className="result-card">
                <p>{variant.caption}</p>
                <span style={{ marginBottom: "8px", display: "block" }}>{variant.rationale}</span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "auto" }}>
                  <button
                    type="button"
                    className="btn-vox btn-vox-primary"
                    style={{ fontSize: "12px", padding: "6px 14px" }}
                    disabled={isGeneratingHashtags}
                    onClick={() => void generateHashtags(variant.caption)}
                  >
                    {isGeneratingHashtags && selectedCaption === variant.caption
                      ? "Generating..."
                      : "Get Hashtags"} <span className="arrow">-&gt;</span>
                  </button>
                  <button
                    type="button"
                    className="btn-vox btn-vox-secondary"
                    style={{ fontSize: "12px", padding: "6px 14px" }}
                    onClick={() => schedulePost(variant.caption)}
                  >
                    Schedule
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="lede">No variants generated yet. Fill in the form above and click Generate.</p>
        )}
      </div>
    </section>
  );
}
