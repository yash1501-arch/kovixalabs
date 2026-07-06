"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { getWorkspaceId } from "../lib/client-auth";

type MusicTrack = {
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  duration: string;
  mood: string;
  licenseType: string;
  previewDescription: string;
};

type MusicSuggestion = {
  id: string;
  workspaceId: string;
  brandId: string;
  platform: string;
  mood: string;
  genre: string;
  tracks: MusicTrack[];
  createdAt: string;
};

type Brand = { id: string; name: string };

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X (Twitter)" }
];

const MOODS = [
  { value: "energetic", label: "Energetic" },
  { value: "calm", label: "Calm" },
  { value: "inspirational", label: "Inspirational" },
  { value: "playful", label: "Playful" },
  { value: "dramatic", label: "Dramatic" },
  { value: "corporate", label: "Corporate" }
];

const MOOD_COLORS: Record<string, string> = {
  energetic: "#F97316",
  calm: "#3B82F6",
  inspirational: "#8B5CF6",
  playful: "#10B981",
  dramatic: "var(--accent)",
  corporate: "#6B7280"
};

const GENRES = [
  { value: "", label: "Any Genre" },
  { value: "pop", label: "Pop" },
  { value: "hip-hop", label: "Hip-Hop" },
  { value: "electronic", label: "Electronic" },
  { value: "acoustic", label: "Acoustic" },
  { value: "cinematic", label: "Cinematic" },
  { value: "jazz", label: "Jazz" },
  { value: "lo-fi", label: "Lo-Fi" }
];

export function MusicAIClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState({
    brandId: "",
    platform: "instagram",
    mood: "energetic",
    genre: "",
    contentType: ""
  });
  const [isFinding, setIsFinding] = useState(false);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [savedSuggestions, setSavedSuggestions] = useState<MusicSuggestion[]>([]);
  const [status, setStatus] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const workspaceId = getWorkspaceId();

  async function loadData() {
    try {
      const [suggestionsRes, brandsRes] = await Promise.all([
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/music-suggestions`)),
        fetch(apiUrl(`/v1/workspaces/${workspaceId}/brands`))
      ]);
      if (suggestionsRes.ok) setSavedSuggestions(await suggestionsRes.json());
      if (brandsRes.ok) {
        const b: Brand[] = await brandsRes.json();
        setBrands(b);
        const first = b[0];
        if (first) setForm(f => ({ ...f, brandId: first.id }));
      }
    } catch { /* silently fail */ }
  }

  useEffect(() => { void loadData(); }, []);

  async function findMusic() {
    if (!form.brandId) { setStatus("Please select a brand."); return; }
    setIsFinding(true);
    setStatus("Generating track...");
    setTracks([]);
    try {
      const res = await fetch(apiUrl(`/v1/workspaces/${workspaceId}/generate/music`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          genre: form.genre || "pop",
          mood: form.mood,
          durationSeconds: 30,
          style: form.contentType || undefined,
          prompt: form.contentType ? `Create music for ${form.contentType} content on ${form.platform}` : undefined,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setTracks([{
        title: data.title,
        artist: "AISMOS AI",
        genre: data.genre,
        bpm: 120,
        duration: `${data.duration_seconds}s`,
        mood: data.mood,
        licenseType: "Generated",
        previewDescription: `AI-generated ${data.genre} track with ${data.mood} mood. [Task: ${data.task_id.slice(0, 8)}]`,
      }]);
      setStatus("Track generated.");
    } catch { setStatus("Generation failed. Check your LLM model configuration."); }
    finally { setIsFinding(false); }
  }

  async function deleteSuggestion(id: string) {
    try {
      await fetch(apiUrl(`/v1/workspaces/${workspaceId}/music-suggestions/${id}`), { method: "DELETE" });
      setSavedSuggestions(prev => prev.filter(s => s.id !== id));
    } catch { /* silently fail */ }
  }

  const moodColor = MOOD_COLORS[form.mood] ?? "var(--accent)";

  return (
    <section className="dashboard-grid">
      {/* Left: Form */}
      <div className="panel panel-medium" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Find Music</h2>

        {status && (
          <p style={{ fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)", margin: 0 }}>{status}</p>
        )}

        <div className="field">
          <label>Brand</label>
          <select value={form.brandId} onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))}>
            <option value="">Select brand</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Platform</label>
          <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
            {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Mood</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
            {MOODS.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, mood: m.value }))}
                style={{
                  fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase",
                  letterSpacing: "0.05em", padding: "5px 12px", cursor: "pointer",
                  background: form.mood === m.value ? `${MOOD_COLORS[m.value]}28` : "var(--bg-base)",
                  color: form.mood === m.value ? MOOD_COLORS[m.value] : "var(--fg-muted)",
                  border: `1px solid ${form.mood === m.value ? MOOD_COLORS[m.value] ?? "var(--border)" : "var(--border)"}`,
                  transition: "all 0.2s ease"
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Genre</label>
          <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}>
            {GENRES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Content Type <span style={{ color: "var(--fg-muted)", fontWeight: 400 }}>(optional)</span></label>
          <input
            value={form.contentType}
            onChange={e => setForm(f => ({ ...f, contentType: e.target.value }))}
            placeholder="e.g. product demo, brand story, tutorial"
          />
        </div>

        <button
          type="button"
          className="btn-vox btn-vox-primary"
          disabled={isFinding}
          onClick={() => void findMusic()}
          style={{ background: moodColor, borderColor: moodColor }}
        >
          {isFinding ? "Searching..." : "Find Music"} <span className="arrow">-&gt;</span>
        </button>
      </div>

      {/* Right: Track results */}
      <div className="panel panel-large" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {tracks.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "300px", gap: "16px" }}>
            <p className="lede">Select your mood and find the perfect soundtrack.</p>
          </div>
        ) : (
          <>
            <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Recommended Tracks</h2>
            <div style={{ display: "grid", gap: "12px" }}>
              {tracks.map((track, i) => (
                <div key={i} style={{
                  padding: "16px",
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  borderLeft: `3px solid ${MOOD_COLORS[track.mood] ?? "var(--accent)"}`,
                  display: "flex", flexDirection: "column", gap: "10px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 800, color: "var(--fg)", textTransform: "uppercase", letterSpacing: "0.02em" }}>{track.title}</div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg-muted)", fontStyle: "italic", marginTop: "2px" }}>{track.artist}</div>
                    </div>
                    <span style={{
                      fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase",
                      letterSpacing: "0.06em", padding: "3px 8px",
                      background: "rgba(16,185,129,0.12)", color: "#10B981",
                      border: "1px solid rgba(16,185,129,0.3)", whiteSpace: "nowrap"
                    }}>royalty-free</span>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", padding: "2px 8px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{track.genre}</span>
                    <span style={{
                      fontFamily: "var(--font-heading)", fontSize: "10px", padding: "2px 8px",
                      background: `${MOOD_COLORS[track.mood] ?? "var(--accent)"}18`,
                      color: MOOD_COLORS[track.mood] ?? "var(--accent)",
                      border: `1px solid ${MOOD_COLORS[track.mood] ?? "var(--accent)"}40`,
                      textTransform: "uppercase", letterSpacing: "0.04em"
                    }}>{track.mood}</span>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "12px", color: "var(--fg-muted)" }}>{track.bpm} BPM</span>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "12px", color: "var(--fg-subtle)" }}>{track.duration}</span>
                  </div>

                  <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--fg-subtle)", fontStyle: "italic", margin: 0, lineHeight: 1.4 }}>{track.previewDescription}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Saved Suggestions — full width */}
      {savedSuggestions.length > 0 && (
        <div className="panel" style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2 style={{ margin: 0, borderBottom: "none", padding: 0 }}>Saved Suggestions</h2>
          <div style={{ display: "grid", gap: "10px" }}>
            {savedSuggestions.map(suggestion => (
              <div key={suggestion.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{
                      fontFamily: "var(--font-heading)", fontSize: "11px", textTransform: "uppercase",
                      letterSpacing: "0.05em", padding: "3px 10px",
                      background: `${MOOD_COLORS[suggestion.mood] ?? "var(--accent)"}18`,
                      color: MOOD_COLORS[suggestion.mood] ?? "var(--accent)",
                      border: `1px solid ${MOOD_COLORS[suggestion.mood] ?? "var(--accent)"}40`
                    }}>{suggestion.mood}</span>
                    {suggestion.genre && (
                      <span style={{ fontFamily: "var(--font-heading)", fontSize: "11px", padding: "3px 10px", background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--fg-muted)", textTransform: "uppercase" }}>{suggestion.genre}</span>
                    )}
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-muted)" }}>
                      {suggestion.tracks.length} tracks · {suggestion.platform}
                    </span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--fg-subtle)", fontStyle: "italic" }}>
                      {new Date(suggestion.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="btn-vox btn-vox-secondary"
                      style={{ fontSize: "11px", padding: "5px 12px" }}
                      onClick={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
                    >
                      {expandedId === suggestion.id ? "Hide" : "View"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSuggestion(suggestion.id)}
                      style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", color: "var(--fg-subtle)", background: "none", border: "none", cursor: "pointer", padding: "5px 8px" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {expandedId === suggestion.id && (
                  <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
                    {suggestion.tracks.map((track, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 14px", background: "var(--bg-base)", border: "1px solid var(--border)"
                      }}>
                        <div>
                          <span style={{ fontFamily: "var(--font-heading)", fontSize: "13px", fontWeight: 700, textTransform: "uppercase", color: "var(--fg)" }}>{track.title}</span>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--fg-muted)", fontStyle: "italic", marginLeft: "8px" }}>{track.artist}</span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: "var(--fg-subtle)" }}>{track.bpm} BPM</span>
                          <span style={{ fontFamily: "var(--font-heading)", fontSize: "10px", color: "var(--fg-subtle)" }}>{track.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
