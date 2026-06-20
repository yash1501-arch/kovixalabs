import { env } from "../config.js";
import { ApiError } from "../utils/api-error.js";

export const metaGraphApiVersion = env.metaGraphApiVersion;
const graphBaseUrl = `https://graph.facebook.com/${metaGraphApiVersion}`;
const facebookBaseUrl = `https://www.facebook.com/${metaGraphApiVersion}`;

export type MetaPlatform = "facebook" | "instagram";

export const facebookScopes = [
  "pages_show_list",
  "pages_read_engagement",
  "business_management"
];

export const instagramScopes = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list"
];

export type MetaTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export type FacebookPage = {
  id: string;
  name: string;
  access_token?: string;
  category?: string;
  fan_count?: number;
  followers_count?: number;
  link?: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id: string };
};

export type InstagramBusinessAccount = {
  id: string;
  ig_id?: string | number;
  username?: string;
  name?: string;
  biography?: string;
  website?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
};

export function redirectUriFor(platform: MetaPlatform): string {
  return env.metaRedirectUri.replace("{platform}", platform);
}

export function scopesFor(platform: MetaPlatform): string[] {
  return platform === "facebook" ? facebookScopes : instagramScopes;
}

export function buildAuthorizationUrl(input: {
  platform: MetaPlatform;
  state: string;
}): string {
  if (!env.metaAppId || !env.metaAppSecret) {
    throw new ApiError(
      500,
      "meta_not_configured",
      "META_APP_ID and META_APP_SECRET must be configured."
    );
  }

  const url = new URL(`${facebookBaseUrl}/dialog/oauth`);
  url.searchParams.set("client_id", env.metaAppId);
  url.searchParams.set("redirect_uri", redirectUriFor(input.platform));
  url.searchParams.set("state", input.state);
  url.searchParams.set("scope", scopesFor(input.platform).join(","));
  url.searchParams.set("response_type", "code");

  return url.toString();
}

async function readMetaResponse<T>(response: Response, action: string): Promise<T> {
  const body = await response.text();
  const data = body ? JSON.parse(body) : {};

  if (!response.ok || data.error) {
    const message =
      data.error?.message ??
      data.error_description ??
      body ??
      `${action} failed.`;
    throw new ApiError(response.status || 502, "meta_graph_error", message);
  }

  return data as T;
}

export async function exchangeCodeForToken(
  platform: MetaPlatform,
  code: string
): Promise<MetaTokenResponse> {
  const url = new URL(`${graphBaseUrl}/oauth/access_token`);
  url.searchParams.set("client_id", env.metaAppId);
  url.searchParams.set("client_secret", env.metaAppSecret);
  url.searchParams.set("redirect_uri", redirectUriFor(platform));
  url.searchParams.set("code", code);

  return readMetaResponse<MetaTokenResponse>(
    await fetch(url),
    "Meta authorization code exchange"
  );
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<MetaTokenResponse> {
  const url = new URL(`${graphBaseUrl}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", env.metaAppId);
  url.searchParams.set("client_secret", env.metaAppSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  return readMetaResponse<MetaTokenResponse>(
    await fetch(url),
    "Meta long-lived token exchange"
  );
}

export async function debugToken(accessToken: string): Promise<{
  data?: { scopes?: string[]; expires_at?: number; is_valid?: boolean };
}> {
  const url = new URL(`${graphBaseUrl}/debug_token`);
  url.searchParams.set("input_token", accessToken);
  url.searchParams.set("access_token", `${env.metaAppId}|${env.metaAppSecret}`);

  return readMetaResponse(await fetch(url), "Meta token debug");
}

export async function fetchFacebookPages(accessToken: string): Promise<FacebookPage[]> {
  const url = new URL(`${graphBaseUrl}/me/accounts`);
  url.searchParams.set(
    "fields",
    "id,name,category,fan_count,followers_count,link,picture{url},access_token,instagram_business_account"
  );
  url.searchParams.set("access_token", accessToken);

  const data = await readMetaResponse<{ data?: FacebookPage[] }>(
    await fetch(url),
    "Facebook pages fetch"
  );

  return data.data ?? [];
}

export async function fetchInstagramBusinessAccount(
  pageId: string,
  pageAccessToken: string
): Promise<InstagramBusinessAccount | null> {
  const pageUrl = new URL(`${graphBaseUrl}/${pageId}`);
  pageUrl.searchParams.set("fields", "instagram_business_account");
  pageUrl.searchParams.set("access_token", pageAccessToken);

  const pageData = await readMetaResponse<{
    instagram_business_account?: { id?: string };
  }>(await fetch(pageUrl), "Instagram business account lookup");

  const instagramId = pageData.instagram_business_account?.id;
  if (!instagramId) {
    return null;
  }

  const profileUrl = new URL(`${graphBaseUrl}/${instagramId}`);
  profileUrl.searchParams.set(
    "fields",
    "id,ig_id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url"
  );
  profileUrl.searchParams.set("access_token", pageAccessToken);

  return readMetaResponse<InstagramBusinessAccount>(
    await fetch(profileUrl),
    "Instagram business profile fetch"
  );
}

export function tokenExpiryFromResponse(token: MetaTokenResponse): Date | null {
  if (!token.expires_in) {
    return null;
  }

  return new Date(Date.now() + token.expires_in * 1000);
}
