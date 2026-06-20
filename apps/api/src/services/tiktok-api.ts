import { env } from "../config.js";
import { ApiError } from "../utils/api-error.js";

const apiBase = "https://open.tiktokapis.com/v2";
const authBase = "https://www.tiktok.com/v2/auth/authorize";

export type TikTokTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  scope?: string;
  open_id?: string;
  token_type?: string;
};

export type TikTokUserInfo = {
  open_id: string;
  union_id?: string;
  display_name?: string;
  avatar_url?: string;
  follower_count?: number;
  following_count?: number;
  bio_description?: string;
};

async function readResponse<T>(response: Response, action: string): Promise<T> {
  const body = await response.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(body); } catch { throw new ApiError(response.status || 502, "tiktok_api_error", body || `${action} failed.`); }
  if (!response.ok || (data as { error?: { code?: string } }).error?.code) {
    const msg = (data as { error?: { message?: string } }).error?.message ?? (data as { message?: string }).message ?? body;
    throw new ApiError(response.status || 502, "tiktok_api_error", msg);
  }
  return data as T;
}

export function buildAuthorizationUrl(state: string): string {
  const url = new URL(authBase);
  url.searchParams.set("client_key", env.tiktokClientKey);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "user.info.basic,video.publish,video.upload");
  url.searchParams.set("redirect_uri", env.tiktokRedirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<TikTokTokenResponse> {
  const response = await fetch(`${apiBase}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key: env.tiktokClientKey,
      client_secret: env.tiktokClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: env.tiktokRedirectUri,
    }),
  });
  const data = await readResponse<{ access_token: string; expires_in: number; refresh_token?: string; refresh_expires_in?: number; scope?: string; open_id?: string; token_type?: string }>(response, "TikTok token exchange");
  return data;
}

export async function refreshAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
  const response = await fetch(`${apiBase}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: env.tiktokClientKey,
      client_secret: env.tiktokClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await readResponse<{ access_token: string; expires_in: number; refresh_token?: string }>(response, "TikTok token refresh");
  return data;
}

export async function fetchUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  const response = await fetch(`${apiBase}/user/info/?fields=open_id,union_id,display_name,avatar_url,follower_count,following_count,bio_description`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await readResponse<{ data: { user: TikTokUserInfo } }>(response, "TikTok user info");
  return data.data.user;
}

export async function uploadVideo(input: {
  accessToken: string;
  openId: string;
  videoUrl: string;
  caption: string;
}): Promise<{ publish_id: string }> {
  const videoData = await fetch(input.videoUrl).then((r) => r.arrayBuffer());
  const videoBlob = new Blob([videoData]);
  const formData = new FormData();
  formData.append("video", videoBlob, "video.mp4");
  formData.append("access_token", input.accessToken);
  formData.append("open_id", input.openId);

  const uploadResponse = await fetch(`${apiBase}/video/upload/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: formData,
  });
  const uploadData = await readResponse<{ data: { upload_id: string } }>(uploadResponse, "TikTok video upload");

  const publishResponse = await fetch(`${apiBase}/video/publish/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      upload_id: uploadData.data.upload_id,
      open_id: input.openId,
      privacy_level: "PUBLIC",
      source_info: { source: "PULL_FROM_URL", video_url: input.videoUrl },
      post_info: { title: input.caption, disable_duet: false, disable_stitch: false, disable_comment: false },
    }),
  });
  const publishData = await readResponse<{ data: { publish_id: string } }>(publishResponse, "TikTok video publish");
  return publishData.data;
}
