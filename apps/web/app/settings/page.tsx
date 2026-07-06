"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "../lib/api";
import { getAuthHeaders, getWorkspaceId } from "../lib/client-auth";

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
};

type WorkspaceInfo = {
  id: string;
  name: string;
  slug: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const workspaceId = getWorkspaceId();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [profileName, setProfileName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileStatus, setProfileStatus] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [workspaceStatus, setWorkspaceStatus] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(apiUrl("/v1/auth/me"), { headers: { ...getAuthHeaders() } });
        if (!res.ok) { router.push("/auth/login"); return; }
        const data = await res.json() as { user: UserProfile; workspace: WorkspaceInfo };
        setProfile(data.user);
        setWorkspace(data.workspace);
        setProfileName(data.user.name ?? "");
        setWorkspaceName(data.workspace.name);
      } catch {
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  async function handleProfileUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileStatus("");
    try {
      const res = await fetch(apiUrl("/v1/auth/profile"), {
        method: "PATCH",
        headers: { "content-type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name: profileName }),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json() as UserProfile;
      setProfile(updated);
      setProfileStatus("Profile updated.");
    } catch {
      setProfileStatus("Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) { setPasswordStatus("Passwords do not match."); return; }
    setPasswordSaving(true);
    setPasswordStatus("");
    try {
      const res = await fetch(apiUrl("/v1/auth/change-password"), {
        method: "POST",
        headers: { "content-type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error("Password change failed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus("Password changed. Please sign in again.");
    } catch {
      setPasswordStatus("Failed to change password. Check your current password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleWorkspaceUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorkspaceSaving(true);
    setWorkspaceStatus("");
    try {
      const res = await fetch(apiUrl(`/v1/auth/workspaces/${workspaceId}`), {
        method: "PATCH",
        headers: { "content-type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name: workspaceName }),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json() as WorkspaceInfo;
      setWorkspace(updated);
      setWorkspaceStatus("Workspace updated.");
    } catch {
      setWorkspaceStatus("Failed to update workspace.");
    } finally {
      setWorkspaceSaving(false);
    }
  }

  if (loading) return <p className="lede" style={{ padding: "40px" }}>Loading settings...</p>;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Account & Workspace</p>
          <h1>Settings</h1>
        </div>
      </div>

      <div style={{ display: "grid", gap: "24px", maxWidth: "640px" }}>
        {/* Profile */}
        <div className="panel">
          <h2 style={{ marginBottom: "20px" }}>Profile</h2>
          {profileStatus && (
            <div className={`auth-${profileStatus.includes("Failed") ? "alert" : "success"}`} style={{ marginBottom: "16px" }}>{profileStatus}</div>
          )}
          <form onSubmit={handleProfileUpdate} className="auth-form">
            <div className="auth-field">
              <label htmlFor="settings-email">Email</label>
              <input id="settings-email" className="auth-input" value={profile?.email ?? ""} disabled />
            </div>
            <div className="auth-field">
              <label htmlFor="settings-name">Display name</label>
              <input id="settings-name" className="auth-input" value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
            </div>
            <button type="submit" className="auth-submit" disabled={profileSaving} style={{ justifySelf: "start" }}>
              {profileSaving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="panel">
          <h2 style={{ marginBottom: "20px" }}>Change Password</h2>
          {passwordStatus && (
            <div className={`auth-${passwordStatus.includes("failed") || passwordStatus.includes("match") ? "alert" : "success"}`} style={{ marginBottom: "16px" }}>{passwordStatus}</div>
          )}
          <form onSubmit={handlePasswordChange} className="auth-form">
            <div className="auth-field">
              <label htmlFor="settings-current-password">Current password</label>
              <input id="settings-current-password" className="auth-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="auth-field">
              <label htmlFor="settings-new-password">New password</label>
              <input id="settings-new-password" className="auth-input" type="password" placeholder="Min. 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="auth-field">
              <label htmlFor="settings-confirm-password">Confirm new password</label>
              <input id="settings-confirm-password" className="auth-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
            </div>
            <button type="submit" className="auth-submit" disabled={passwordSaving} style={{ justifySelf: "start" }}>
              {passwordSaving ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>

        {/* Workspace */}
        <div className="panel">
          <h2 style={{ marginBottom: "20px" }}>Workspace</h2>
          {workspaceStatus && (
            <div className={`auth-${workspaceStatus.includes("Failed") ? "alert" : "success"}`} style={{ marginBottom: "16px" }}>{workspaceStatus}</div>
          )}
          <form onSubmit={handleWorkspaceUpdate} className="auth-form">
            <div className="auth-field">
              <label htmlFor="settings-workspace-slug">Slug</label>
              <input id="settings-workspace-slug" className="auth-input" value={workspace?.slug ?? ""} disabled />
            </div>
            <div className="auth-field">
              <label htmlFor="settings-workspace-name">Workspace name</label>
              <input id="settings-workspace-name" className="auth-input" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} required />
            </div>
            <button type="submit" className="auth-submit" disabled={workspaceSaving} style={{ justifySelf: "start" }}>
              {workspaceSaving ? "Saving..." : "Save Workspace"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
