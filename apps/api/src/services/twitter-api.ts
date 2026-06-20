import { env } from "../config.js";
import { ApiError } from "../utils/api-error.js";

const apiBase = "https://api.twitter.com/2";
const authBase = "https://twitter.com/i/oauth2";

export type TwitterTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
};

export type TwitterUser = {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
};

async function readResponse<T>(response: Response, action: string): Promise<T> {
  const body = await response.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(body); } catch { throw new ApiError(response.status || 502, "twitter_api_error", body || `${action} failed.`); }
  if (!response.ok) {
    const message = (data as { detail?: string; title?: string }).detail ?? (data as { title?: string }).title ?? body ?? `${action} failed.`;
    throw new ApiError(response.status || 502, "twitter_api_error", message);
  }
  return data as T;
}

function basicAuth(): string {
  return Buffer.from(`${env.twitterClientId}:${env.twitterClientSecret}`).toString("base64");
}

export function buildAuthorizationUrl(state: string, codeVerifier: string): string {
  const url = new URL(`${authBase}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.twitterClientId);
  url.searchParams.set("redirect_uri", env.twitterRedirectUri);
  url.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge_method", "plain");
  url.searchParams.set("code_challenge", codeVerifier);
  return url.toString();
}

export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<TwitterTokenResponse> {
  const response = await fetch(`${apiBase}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.twitterRedirectUri,
      code_verifier: codeVerifier,
    }),
  });
  return readResponse<TwitterTokenResponse>(response, "Twitter token exchange");
}

export async function refreshAccessToken(refreshToken: string): Promise<TwitterTokenResponse> {
  const response = await fetch(`${apiBase}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.twitterClientId,
    }),
  });
  return readResponse<TwitterTokenResponse>(response, "Twitter token refresh");
}

export async function fetchUserInfo(accessToken: string): Promise<TwitterUser> {
  const response = await fetch(`${apiBase}/users/me?user.fields=profile_image_url`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await readResponse<{ data: TwitterUser }>(response, "Twitter user info");
  return data.data;
}

export async function createTweet(accessToken: string, text: string): Promise<{ id: string; text: string }> {
  if (text.length > 280) throw new ApiError(400, "tweet_too_long", `Tweet text exceeds 280 characters (${text.length}).`);
  const response = await fetch(`${apiBase}/tweets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await readResponse<{ data: { id: string; text: string } }>(response, "Tweet creation");
  return data.data;
}

export async function createTweetWithMedia(input: {
  accessToken: string;
  text: string;
  mediaUrl: string;
}): Promise<{ id: string; text: string }> {
  const mediaResponse = await fetch(`${apiBase}/media/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: await fetch(input.mediaUrl).then((r) => r.blob()),
  });
  const mediaData = await readResponse<{ media_id_string: string }>(mediaResponse, "Twitter media upload");
  const response = await fetch(`${apiBase}/tweets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: input.text, media: { media_ids: [mediaData.media_id_string] } }),
  });
  const data = await readResponse<{ data: { id: string; text: string } }>(response, "Tweet with media creation");
  return data.data;
}
