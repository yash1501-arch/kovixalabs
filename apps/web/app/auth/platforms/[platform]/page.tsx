"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { apiUrl } from "../../../lib/api";
import { getWorkspaceId } from "../../../lib/client-auth";
import "../../auth.css";

const platformDetails: Record<
  string,
  { label: string; icon: string; color: string; scopes: string[] }
> = {
  instagram: {
    label: "Instagram",
    icon: "IG",
    color: "#E4405F",
    scopes: ["instagram_basic", "instagram_content_publish", "instagram_insights"]
  },
  linkedin: {
    label: "LinkedIn",
    icon: "LI",
    color: "#0A66C2",
    scopes: ["r_liteprofile", "w_member_social", "r_organization_social", "w_organization_social"]
  },
  x: {
    label: "X / Twitter",
    icon: "X",
    color: "#FFFFFF",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"]
  },
  facebook: {
    label: "Facebook",
    icon: "FB",
    color: "#1877F2",
    scopes: ["pages_read_engagement", "pages_manage_posts", "pages_show_list"]
  },
  tiktok: {
    label: "TikTok",
    icon: "TT",
    color: "#69C9D0",
    scopes: ["user.info.basic", "video.publish", "video.list"]
  },
  youtube: {
    label: "YouTube",
    icon: "YT",
    color: "#FF0000",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/youtube.upload"]
  }
};

export default function PlatformAuthPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const platform = (params?.platform as string) || "linkedin";
  const workspaceId = searchParams.get("workspaceId") || getWorkspaceId();

  const details = platformDetails[platform] || {
    label: "Platform",
    icon: "API",
    color: "var(--accent)",
    scopes: ["read", "write"]
  };

  const [form, setForm] = useState({ handle: "", displayName: "" });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [success, setSuccess] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.handle || !form.displayName) {
      setStatus("Both handle and display name are required.");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const res = await fetch(apiUrl(`/v1/auth/platforms/${platform}/callback`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          handle: form.handle.trim().replace(/^@/, ""),
          displayName: form.displayName.trim()
        })
      });

      if (!res.ok) {
        throw new Error(`Callback failed with status ${res.status}`);
      }

      setSuccess(true);
      setStatus("Connection authorized! Redirecting back to integrations...");

      setTimeout(() => {
        router.push("/integrations?success=true");
      }, 2000);
    } catch (err) {
      setSubmitting(false);
      setStatus("Authorization failed. Please try again.");
    }
  };

  return (
    <div className="auth-container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", position: "relative", overflow: "hidden" }}>
      <div className="grid-bg-overlay" aria-hidden="true" style={{ opacity: 0.15 }} />

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: "480px", padding: "40px", border: "1px solid var(--border)", background: "rgba(18, 18, 18, 0.8)", backdropFilter: "blur(20px)", borderRadius: "12px", zIndex: 10 }}
      >
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "24px", marginBottom: "32px" }}>
          <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-heading)", letterSpacing: "0.1em", color: "var(--fg)" }}>AISMOS</div>
          <div style={{ width: "24px", height: "1px", background: "var(--border)" }} />
          <div style={{
            width: "42px",
            height: "42px",
            borderRadius: "8px",
            background: `${details.color}15`,
            border: `1px solid ${details.color}35`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: "12px",
            color: details.color
          }}>
            {details.icon}
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--fg)", marginBottom: "8px" }}>
            Connect to {details.label}
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--fg-muted)", lineHeight: 1.5 }}>
            AISMOS is requesting permission to access your profile data, schedule media posts, and retrieve analytics.
          </p>
        </div>

        {status && (
          <div style={{
            marginBottom: "20px",
            padding: "10px 14px",
            background: success ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${success ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
            fontFamily: "var(--font-heading)",
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: success ? "#10B981" : "#EF4444"
          }}>
            {status}
          </div>
        )}

        {!success && (
          <form onSubmit={handleConnect} style={{ display: "grid", gap: "20px" }}>
            <div className="field">
              <label htmlFor="auth-handle" style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-subtle)", display: "block", marginBottom: "6px" }}>
                Account Handle (without @)
              </label>
              <input
                id="auth-handle"
                placeholder={`e.g. MyBrand_${details.label.replace(/\s+/g, "")}`}
                value={form.handle}
                onChange={e => setForm(prev => ({ ...prev, handle: e.target.value }))}
                style={{ width: "100%", padding: "10px 14px", background: "#141414", border: "1px solid var(--border)", color: "var(--fg)", fontFamily: "var(--font-body)", fontSize: "14px", borderRadius: "4px" }}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="auth-display-name" style={{ fontFamily: "var(--font-heading)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-subtle)", display: "block", marginBottom: "6px" }}>
                Display Name
              </label>
              <input
                id="auth-display-name"
                placeholder="e.g. My Brand Official"
                value={form.displayName}
                onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value }))}
                style={{ width: "100%", padding: "10px 14px", background: "#141414", border: "1px solid var(--border)", color: "var(--fg)", fontFamily: "var(--font-body)", fontSize: "14px", borderRadius: "4px" }}
                required
              />
            </div>

            <div style={{ marginTop: "8px" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "8px" }}>
                Requested Scopes:
              </div>
              <ul style={{ margin: 0, paddingLeft: "16px", display: "grid", gap: "4px" }}>
                {details.scopes.map(scope => (
                  <li key={scope} style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--fg-subtle)" }}>
                    {scope}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button
                type="submit"
                disabled={submitting}
                className="btn-vox btn-vox-primary"
                style={{ flex: 1, fontSize: "13px", padding: "10px 0", cursor: submitting ? "not-allowed" : "pointer" }}
              >
                {submitting ? "Authorizing..." : "Approve Connection"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/integrations")}
                className="btn-vox btn-vox-secondary"
                style={{ fontSize: "13px", padding: "10px 20px" }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
