"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BrandMemoryEntryCreateSchema,
  BrandMemoryEntryRecordSchema,
  BrandMemorySearchSchema,
  BrandProfileSchema,
  BrandRecordSchema,
  type BrandMemoryEntryRecord,
  type BrandMemoryEntrySource,
  type BrandRecord
} from "@kovixalabs/shared";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

const emptyBrandForm = {
  name: "",
  description: "",
  targetAudience: "",
  toneOfVoice: "",
  contentPillars: "",
  competitors: "",
  restrictedTopics: "",
  approvedClaims: "",
  visualStyleNotes: ""
};

const emptyEntryForm = {
  title: "",
  content: "",
  tags: "",
  source: "manual" as BrandMemoryEntrySource
};

const emptySearchForm = {
  query: "",
  limit: 5
};

type BrandForm = typeof emptyBrandForm;
type EntryForm = typeof emptyEntryForm;
type SearchForm = typeof emptySearchForm;

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildBrandPayload(form: BrandForm) {
  return BrandProfileSchema.parse({
    name: form.name,
    description: form.description,
    targetAudience: form.targetAudience,
    toneOfVoice: form.toneOfVoice,
    contentPillars: splitList(form.contentPillars),
    competitors: splitList(form.competitors),
    restrictedTopics: splitList(form.restrictedTopics),
    approvedClaims: splitList(form.approvedClaims),
    visualStyleNotes: form.visualStyleNotes || undefined
  });
}

function buildEntryPayload(form: EntryForm) {
  return BrandMemoryEntryCreateSchema.parse({
    title: form.title,
    content: form.content,
    tags: splitList(form.tags),
    source: form.source
  });
}

function buildSearchPayload(form: SearchForm) {
  return BrandMemorySearchSchema.parse({
    query: form.query,
    limit: Number(form.limit)
  });
}

function formatScore(score?: number): string {
  return typeof score === "number" ? `${Math.round(score * 100)}%` : "local";
}

function previewText(value: string, limit = 120): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}...` : value;
}

function joinList(values: string[]): string {
  return values.join(", ");
}

export function BrandMemoryClient() {
  const [form, setForm] = useState<BrandForm>(emptyBrandForm);
  const [entryForm, setEntryForm] = useState<EntryForm>(emptyEntryForm);
  const [searchForm, setSearchForm] = useState<SearchForm>(emptySearchForm);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [entries, setEntries] = useState<BrandMemoryEntryRecord[]>([]);
  const [searchResults, setSearchResults] = useState<BrandMemoryEntryRecord[]>(
    []
  );
  const [status, setStatus] = useState<string>("Loading brand memory...");
  const [entryStatus, setEntryStatus] = useState<string>(
    "Select a brand to load memory entries."
  );
  const [searchStatus, setSearchStatus] = useState<string>(
    "Search retrieves matching memory notes."
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState("");

  const hasBrands = brands.length > 0;
  const workspaceId = getWorkspaceId();

  const latestBrand = useMemo(() => brands[0] ?? null, [brands]);
  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === selectedBrandId) ?? null,
    [brands, selectedBrandId]
  );

  async function loadBrands() {
    try {
      const response = await fetch(
        apiUrl(`/v1/workspaces/${workspaceId}/brands`),
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const body = await response.json();
      const parsedBrands = BrandRecordSchema.array().parse(body);

      setBrands(parsedBrands);
      setSelectedBrandId((current) => {
        const matched = parsedBrands.find((brand) => brand.id === current);
        return matched?.id ?? parsedBrands[0]?.id ?? "";
      });
      setStatus(
        parsedBrands.length
          ? "Brand memory loaded from API."
          : "No brand memory profiles yet."
      );

      if (!parsedBrands.length) {
        setEntries([]);
        setSearchResults([]);
      }
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `API unavailable: ${error.message}`
          : "API unavailable."
      );
    }
  }

  async function loadEntries(brandId: string) {
    setEntryStatus("Loading memory entries...");
    setSearchResults([]);
    setSearchStatus("Search retrieves matching memory notes.");

    try {
      const response = await fetch(apiUrl(`/v1/brands/${brandId}/memory`), {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const body = await response.json();
      const parsedEntries = BrandMemoryEntryRecordSchema.array().parse(body);
      setEntries(parsedEntries);
      setEntryStatus(
        parsedEntries.length
          ? `Loaded ${parsedEntries.length} memory entries.`
          : "No memory entries saved for this brand."
      );
    } catch (error) {
      setEntries([]);
      setEntryStatus(
        error instanceof Error
          ? `Could not load memory entries: ${error.message}`
          : "Could not load memory entries."
      );
    }
  }

  useEffect(() => {
    void loadBrands();
  }, []);

  useEffect(() => {
    if (!selectedBrandId) {
      setEntries([]);
      setSearchResults([]);
      setEntryStatus("Create a brand first to manage memory entries.");
      return;
    }

    void loadEntries(selectedBrandId);
  }, [selectedBrandId]);

  function updateBrandField(field: keyof BrandForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateEntryField(field: keyof EntryForm, value: string) {
    setEntryForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateSearchField(field: keyof SearchForm, value: string | number) {
    setSearchForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function saveBrand() {
    setIsSaving(true);
    setStatus("Saving brand memory...");

    try {
      const payload = buildBrandPayload(form);
      const response = await fetch(
        apiUrl(`/v1/workspaces/${workspaceId}/brands`),
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `API returned ${response.status}`);
      }

      const brand = BrandRecordSchema.parse(await response.json());
      setBrands((current) => [brand, ...current.filter((item) => item.id !== brand.id)]);
      setSelectedBrandId(brand.id);
      setForm(emptyBrandForm);
      setStatus("Brand memory saved.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Could not save brand memory: ${error.message}`
          : "Could not save brand memory."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveEntry() {
    if (!selectedBrandId) {
      setEntryStatus("Create or select a brand first.");
      return;
    }

    setIsSavingEntry(true);
    setEntryStatus("Saving memory entry...");

    try {
      const payload = buildEntryPayload(entryForm);
      const response = await fetch(apiUrl(`/v1/brands/${selectedBrandId}/memory`), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `API returned ${response.status}`);
      }

      const entry = BrandMemoryEntryRecordSchema.parse(await response.json());
      setEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
      setEntryForm(emptyEntryForm);
      setEntryStatus("Memory entry saved.");
    } catch (error) {
      setEntryStatus(
        error instanceof Error
          ? `Could not save memory entry: ${error.message}`
          : "Could not save memory entry."
      );
    } finally {
      setIsSavingEntry(false);
    }
  }

  async function searchEntries() {
    if (!selectedBrandId) {
      setSearchStatus("Create or select a brand first.");
      return;
    }

    setIsSearching(true);
    setSearchStatus("Searching memory...");

    try {
      const payload = buildSearchPayload(searchForm);
      const response = await fetch(
        apiUrl(`/v1/brands/${selectedBrandId}/memory/search`),
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `API returned ${response.status}`);
      }

      const results = BrandMemoryEntryRecordSchema.array().parse(
        await response.json()
      );
      setSearchResults(results);
      setSearchStatus(
        results.length
          ? `Found ${results.length} matching entries.`
          : "No matching entries found."
      );
    } catch (error) {
      setSearchStatus(
        error instanceof Error
          ? `Could not search memory: ${error.message}`
          : "Could not search memory."
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section className="dashboard-grid" aria-label="Brand memory workspace">
      <div className="panel panel-large">
        <h2>Create Brand Memory</h2>
        <form className="studio-form">
          <div className="field">
            <label htmlFor="brand-name">Brand name</label>
            <input
              id="brand-name"
              value={form.name}
              onChange={(event) => updateBrandField("name", event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="brand-description">Description</label>
            <textarea
              id="brand-description"
              value={form.description}
              onChange={(event) =>
                updateBrandField("description", event.target.value)
              }
            />
          </div>
          <div className="field">
            <label htmlFor="target-audience">Target audience</label>
            <input
              id="target-audience"
              value={form.targetAudience}
              onChange={(event) =>
                updateBrandField("targetAudience", event.target.value)
              }
            />
          </div>
          <div className="field">
            <label htmlFor="tone-of-voice">Tone of voice</label>
            <input
              id="tone-of-voice"
              value={form.toneOfVoice}
              onChange={(event) =>
                updateBrandField("toneOfVoice", event.target.value)
              }
            />
          </div>
          <div className="field">
            <label htmlFor="content-pillars">Content pillars</label>
            <input
              id="content-pillars"
              placeholder="Comma-separated"
              value={form.contentPillars}
              onChange={(event) =>
                updateBrandField("contentPillars", event.target.value)
              }
            />
          </div>
          <div className="field">
            <label htmlFor="competitors">Competitors</label>
            <input
              id="competitors"
              placeholder="Comma-separated"
              value={form.competitors}
              onChange={(event) =>
                updateBrandField("competitors", event.target.value)
              }
            />
          </div>
          <div className="field">
            <label htmlFor="restricted-topics">Restricted topics</label>
            <input
              id="restricted-topics"
              placeholder="Comma-separated"
              value={form.restrictedTopics}
              onChange={(event) =>
                updateBrandField("restrictedTopics", event.target.value)
              }
            />
          </div>
          <div className="field">
            <label htmlFor="approved-claims">Approved claims</label>
            <input
              id="approved-claims"
              placeholder="Comma-separated"
              value={form.approvedClaims}
              onChange={(event) =>
                updateBrandField("approvedClaims", event.target.value)
              }
            />
          </div>
          <div className="field">
            <label htmlFor="visual-style-notes">Visual style notes</label>
            <textarea
              id="visual-style-notes"
              value={form.visualStyleNotes}
              onChange={(event) =>
                updateBrandField("visualStyleNotes", event.target.value)
              }
            />
          </div>
          <button
            className="btn-vox btn-vox-primary"
            type="button"
            disabled={isSaving}
            onClick={() => void saveBrand()}
          >
            {isSaving ? "Saving..." : "Save Brand Memory"}
          </button>
        </form>
      </div>

      <div className="panel panel-medium">
        <h2>Status</h2>
        <div className="metric-row">
          <div className="metric">
            <span>Brands</span>
            <strong>{brands.length}</strong>
          </div>
          <div className="metric">
            <span>Entries</span>
            <strong>{entries.length}</strong>
          </div>
          <div className="metric">
            <span>Search hits</span>
            <strong>{searchResults.length}</strong>
          </div>
        </div>
        <p className="lede">{status}</p>
        {selectedBrand ? (
          <div className="calendar-item">
            <strong>{selectedBrand.name}</strong>
            <span>{selectedBrand.profile?.toneOfVoice ?? "No tone set"}</span>
            <span>{selectedBrand.description}</span>
          </div>
        ) : latestBrand ? (
          <div className="calendar-item">
            <strong>{latestBrand.name}</strong>
            <span>{latestBrand.profile?.toneOfVoice ?? "No tone set"}</span>
            <span>{latestBrand.description}</span>
          </div>
        ) : null}
      </div>

      <div className="panel panel-full">
        <h2>Memory Workbench</h2>
        <div className="memory-workbench">
          <div className="memory-column">
            <div className="field">
              <label htmlFor="memory-brand">Active brand</label>
              <select
                id="memory-brand"
                value={selectedBrandId}
                onChange={(event) => setSelectedBrandId(event.target.value)}
              >
                <option value="">Select a brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            <form className="studio-form">
              <div className="field">
                <label htmlFor="memory-title">Entry title</label>
                <input
                  id="memory-title"
                  value={entryForm.title}
                  onChange={(event) =>
                    updateEntryField("title", event.target.value)
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="memory-content">Entry content</label>
                <textarea
                  id="memory-content"
                  value={entryForm.content}
                  onChange={(event) =>
                    updateEntryField("content", event.target.value)
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="memory-tags">Tags</label>
                <input
                  id="memory-tags"
                  placeholder="Comma-separated"
                  value={entryForm.tags}
                  onChange={(event) =>
                    updateEntryField("tags", event.target.value)
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="memory-source">Source</label>
                <select
                  id="memory-source"
                  value={entryForm.source}
                  onChange={(event) =>
                    updateEntryField("source", event.target.value)
                  }
                >
                  <option value="manual">Manual</option>
                  <option value="upload">Upload</option>
                  <option value="ai">AI</option>
                </select>
              </div>
              <button
                className="btn-vox btn-vox-primary"
                type="button"
                disabled={isSavingEntry || !selectedBrandId}
                onClick={() => void saveEntry()}
              >
                {isSavingEntry ? "Saving..." : "Save Memory Entry"}
              </button>
            </form>
            <p className="lede">{entryStatus}</p>
          </div>

          <div className="memory-column">
            <form className="studio-form">
              <div className="field">
                <label htmlFor="memory-query">Search query</label>
                <input
                  id="memory-query"
                  value={searchForm.query}
                  onChange={(event) =>
                    updateSearchField("query", event.target.value)
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="memory-limit">Result limit</label>
                <input
                  id="memory-limit"
                  min={1}
                  max={20}
                  type="number"
                  value={searchForm.limit}
                  onChange={(event) =>
                    updateSearchField(
                      "limit",
                      Math.max(1, Number(event.target.value) || 1)
                    )
                  }
                />
              </div>
              <button
                className="btn-vox btn-vox-primary"
                type="button"
                disabled={isSearching || !selectedBrandId}
                onClick={() => void searchEntries()}
              >
                {isSearching ? "Searching..." : "Retrieve Memory"}
              </button>
            </form>
            <p className="lede">{searchStatus}</p>

            {searchResults.length > 0 ? (
              <div className="calendar-list">
                {searchResults.map((entry) => (
                  <div className="pipeline-step" key={entry.id}>
                    <div>
                      <strong>{entry.title}</strong>
                      <span>{previewText(entry.content, 110)}</span>
                      <span>{joinList(entry.tags)} | {entry.source}</span>
                    </div>
                    <span className="status ready">{formatScore(entry.score)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="lede">No retrieved results yet.</p>
            )}
          </div>
        </div>

        <h3 className="section-subhead">Saved entries</h3>
        {entries.length > 0 ? (
          <div className="calendar-list">
            {entries.map((entry) => (
              <div className="calendar-item" key={entry.id}>
                <strong>{entry.title}</strong>
                <span>{previewText(entry.content, 140)}</span>
                <span>{joinList(entry.tags) || "No tags"} | {entry.source}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="lede">No memory entries saved for this brand.</p>
        )}
      </div>

      <div className="panel panel-full">
        <h2>Saved Brands</h2>
        {hasBrands ? (
          <div className="calendar-list">
            {brands.map((brand) => (
              <div className="pipeline-step" key={brand.id}>
                <div>
                  <strong>{brand.name}</strong>
                  <span>{brand.description}</span>
                </div>
                <span className="status ready">
                  {brand.profile?.contentPillars.length ?? 0} pillars
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="lede">No saved brands available.</p>
        )}
      </div>
    </section>
  );
}
