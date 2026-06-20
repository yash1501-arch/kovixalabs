import { env } from "../config.js";
import { ApiError } from "../utils/api-error.js";

const instagramAuthBase = "https://api.instagram.com/oauth";
const graphBase = "https://graph.instagram.com";

export const instagramBasicScopes = [
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
  "instagram_manage_insights"
];

export type InstagramBasicTokenResponse = {
  access_token: string;
  user_id: number;
  token_type?: string;
  expires_in?: number;
};

export type InstagramBasicProfile = {
  user_id: number;
  username: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
  id?: string;
};

export type InstagramBasicLongLivedTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export function buildAuthorizationUrl(state: string): string {
  if (!env.metaAppId) {
    throw new ApiError(500, "meta_not_configured", "META_APP_ID must be configured for Instagram Login.");
  }

  const url = new URL(`${instagramAuthBase}/authorize`);
  url.searchParams.set("client_id", env.metaAppId);
  url.searchParams.set("redirect_uri", env.instagramBasicRedirectUri);
  url.searchParams.set("scope", instagramBasicScopes.join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return url.toString();
}

async function readJsonResponse<T>(response: Response, action: string): Promise<T> {
  const body = await response.text();
  const data = body ? JSON.parse(body) : {};

  if (!response.ok || data.error) {
    const message =
      data.error?.message ??
      data.error_description ??
      data.error?.error_description ??
      body ??
      `${action} failed.`;
    throw new ApiError(response.status || 502, "instagram_api_error", message);
  }

  return data as T;
}

export async function exchangeCodeForToken(code: string): Promise<InstagramBasicTokenResponse> {
  const body = new URLSearchParams({
    client_id: env.metaAppId,
    client_secret: env.metaAppSecret,
    grant_type: "authorization_code",
    redirect_uri: env.instagramBasicRedirectUri,
    code
  });

  return readJsonResponse<InstagramBasicTokenResponse>(
    await fetch(`${instagramAuthBase}/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    }),
    "Instagram Basic authorization code exchange"
  );
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<InstagramBasicLongLivedTokenResponse> {
  const url = new URL(`${graphBase}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", env.metaAppSecret);
  url.searchParams.set("access_token", shortLivedToken);

  return readJsonResponse<InstagramBasicLongLivedTokenResponse>(
    await fetch(url),
    "Instagram Basic long-lived token exchange"
  );
}

export async function fetchUserProfile(
  accessToken: string
): Promise<InstagramBasicProfile> {
  const url = new URL(`${graphBase}/me`);
  url.searchParams.set(
    "fields",
    "user_id,username,name,account_type,profile_picture_url"
  );
  url.searchParams.set("access_token", accessToken);

  return readJsonResponse<InstagramBasicProfile>(
    await fetch(url),
    "Instagram Basic profile fetch"
  );
}
