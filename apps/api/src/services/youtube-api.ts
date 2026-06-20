import { env } from "../config.js";
import { ApiError } from "../utils/api-error.js";

const apiBase = "https://www.googleapis.com/youtube/v3";
const authBase = "https://accounts.google.com/o/oauth2/v2/auth";
const tokenBase = "https://oauth2.googleapis.com/token";

export type YouTubeTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
};

export type YouTubeChannel = {
  id: string;
  title: string;
  description?: string;
  thumbnails?: { default?: { url: string }; high?: { url: string } };
  statistics?: {
    subscriberCount: string;
    videoCount: string;
    viewCount: string;
  };
};

async function readResponse<T>(response: Response, action: string): Promise<T> {
  const body = await response.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(body); } catch { throw new ApiError(response.status || 502, "youtube_api_error", body || `${action} failed.`); }
  if (!response.ok || data.error) {
    const message = (data as { error?: { message?: string } }).error?.message ?? (data as { error_description?: string }).error_description ?? body;
    throw new ApiError(response.status || 502, "youtube_api_error", message);
  }
  return data as T;
}

export function buildAuthorizationUrl(state: string): string {
  const url = new URL(authBase);
  url.searchParams.set("client_id", env.youtubeClientId);
  url.searchParams.set("redirect_uri", env.youtubeRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<YouTubeTokenResponse> {
  const response = await fetch(tokenBase, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.youtubeClientId,
      client_secret: env.youtubeClientSecret,
      redirect_uri: env.youtubeRedirectUri,
      grant_type: "authorization_code",
    }),
  });
  return readResponse<YouTubeTokenResponse>(response, "YouTube token exchange");
}

export async function refreshAccessToken(refreshToken: string): Promise<YouTubeTokenResponse> {
  const response = await fetch(tokenBase, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.youtubeClientId,
      client_secret: env.youtubeClientSecret,
      grant_type: "refresh_token",
    }),
  });
  return readResponse<YouTubeTokenResponse>(response, "YouTube token refresh");
}

export async function fetchMyChannel(accessToken: string): Promise<YouTubeChannel> {
  const response = await fetch(`${apiBase}/channels?part=snippet,statistics&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await readResponse<{ items?: YouTubeChannel[] }>(response, "YouTube channel fetch");
  if (!data.items?.length) throw new ApiError(404, "youtube_channel_not_found", "No YouTube channel found for this user.");
  return data.items[0] as YouTubeChannel;
}

export async function uploadVideo(input: {
  accessToken: string;
  videoUrl: string;
  title: string;
  description: string;
  tags?: string[];
  privacyStatus?: "public" | "private" | "unlisted";
}): Promise<{ id: string }> {
  const videoData = await fetch(input.videoUrl).then((r) => r.arrayBuffer());

  const boundary = `boundary_${Date.now()}`;
  const metadata = JSON.stringify({
    snippet: { title: input.title, description: input.description, tags: input.tags ?? [] },
    status: { privacyStatus: input.privacyStatus ?? "public" },
  });

  const encoder = new TextEncoder();
  const bodyParts = [
    encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    encoder.encode(`--${boundary}\r\nContent-Type: video/*\r\nContent-Transfer-Encoding: binary\r\n\r\n`),
    new Uint8Array(videoData),
    encoder.encode(`\r\n--${boundary}--`),
  ];

  const totalLength = bodyParts.reduce((sum, p) => sum + p.byteLength, 0);
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of bodyParts) {
    body.set(part, offset);
    offset += part.byteLength;
  }

  const response = await fetch(`${apiBase}/videos?part=snippet,status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(totalLength),
    },
    body,
  });
  return readResponse<{ id: string }>(response, "YouTube video upload");
}
