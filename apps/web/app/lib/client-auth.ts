import type { AuthResponse } from "@kovixalabs/shared";

export const authStorageKey = "aismos.auth.session";

export function saveAuthSession(session: AuthResponse): void {
  window.localStorage.setItem(authStorageKey, JSON.stringify(session));
}

export function getAuthSession(): AuthResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(authStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    window.localStorage.removeItem(authStorageKey);
    return null;
  }
}

export function getAuthHeaders(): HeadersInit {
  const session = getAuthSession();
  return session?.token ? { authorization: `Bearer ${session.token}` } : {};
}

export function getWorkspaceId(fallback = "default-workspace"): string {
  return getAuthSession()?.workspace.id ?? fallback;
}
