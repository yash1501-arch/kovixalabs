import { env } from "../config.js";
import { ApiError } from "../utils/api-error.js";

const apiBase = "https://api.linkedin.com/v2";
const authBase = "https://www.linkedin.com/oauth/v2";

export type LinkedinTokenResponse = {
  access_token: string;
  expires_in: number;
  scope?: string;
};

export type LinkedinUserInfo = {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  email?: string;
  picture?: string;
};

export type LinkedinOrganization = {
  id: string;
  localizedName: string;
  vanityName: string;
  logoUrl?: string;
};

async function readResponse<T>(response: Response, action: string): Promise<T> {
  const body = await response.text();
  const data = body ? JSON.parse(body) : {};
  if (!response.ok || data.error) {
    const message = data.error_description ?? data.error?.message ?? data.message ?? body ?? `${action} failed.`;
    throw new ApiError(response.status || 502, "linkedin_api_error", message);
  }
  return data as T;
}

export function buildAuthorizationUrl(state: string): string {
  const url = new URL(`${authBase}/authorization`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.linkedinClientId);
  url.searchParams.set("redirect_uri", env.linkedinRedirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "openid profile email w_member_social r_organization_social w_organization_social");
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch(`${authBase}/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: env.linkedinClientId,
      client_secret: env.linkedinClientSecret,
      redirect_uri: env.linkedinRedirectUri,
    }),
  });
  return readResponse<LinkedinTokenResponse>(response, "LinkedIn token exchange");
}

export async function fetchUserInfo(accessToken: string): Promise<LinkedinUserInfo> {
  const response = await fetch(`${apiBase}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readResponse<LinkedinUserInfo>(response, "LinkedIn user info");
}

export async function fetchOrganizations(accessToken: string): Promise<LinkedinOrganization[]> {
  const response = await fetch(`${apiBase}/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~(id,localizedName,vanityName,logoV2(original~:playableStreams))))`, {
    headers: { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": "202406" },
  });
  const data = await readResponse<{ elements?: { "organizationalTarget~": LinkedinOrganization }[] }>(response, "LinkedIn organizations");
  return (data.elements ?? []).map((e) => e["organizationalTarget~"]);
}

export async function createUgcPost(input: {
  accessToken: string;
  authorId: string;
  text: string;
  visibility?: "PUBLIC" | "CONNECTIONS" | "LOGGED_IN";
}): Promise<{ id: string }> {
  const body = {
    author: `urn:li:organization:${input.authorId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: input.text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": input.visibility ?? "PUBLIC" },
  };
  const response = await fetch(`${apiBase}/ugcPosts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json", "LinkedIn-Version": "202406" },
    body: JSON.stringify(body),
  });
  return readResponse<{ id: string }>(response, "LinkedIn post creation");
}

export async function createPostWithMedia(input: {
  accessToken: string;
  authorId: string;
  text: string;
  mediaUrl: string;
  mediaTitle: string;
  mediaDescription?: string;
  visibility?: "PUBLIC" | "CONNECTIONS" | "LOGGED_IN";
}): Promise<{ id: string }> {
  const mediaResponse = await fetch(`${apiBase}/assets?action=registerUpload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json", "LinkedIn-Version": "202406" },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: `urn:li:organization:${input.authorId}`,
        serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
      },
    }),
  });
  const mediaData = await readResponse<{ value: { uploadMechanism: { "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": { uploadUrl: string } }; asset: string } }>(mediaResponse, "LinkedIn media register");

  const uploadUrl = mediaData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
  const imageResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: await fetch(input.mediaUrl).then((r) => r.blob()),
  });
  if (!imageResponse.ok) throw new ApiError(502, "linkedin_upload_failed", "Failed to upload media to LinkedIn.");

  const body = {
    author: `urn:li:organization:${input.authorId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: input.text },
        shareMediaCategory: "IMAGE",
        media: [{
          status: "READY",
          description: { text: input.mediaDescription ?? input.mediaTitle },
          media: mediaData.value.asset,
          title: { text: input.mediaTitle },
        }],
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": input.visibility ?? "PUBLIC" },
  };
  const response = await fetch(`${apiBase}/ugcPosts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json", "LinkedIn-Version": "202406" },
    body: JSON.stringify(body),
  });
  return readResponse<{ id: string }>(response, "LinkedIn media post creation");
}
