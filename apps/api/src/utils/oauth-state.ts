import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config.js";
import { ApiError } from "./api-error.js";

type OAuthStatePayload = {
  platform: "facebook" | "instagram" | "instagram-basic" | "linkedin" | "twitter" | "tiktok" | "youtube";
  workspaceId: string;
  userId: string;
  nonce: string;
  exp: number;
  codeVerifier?: string;
};

function stateSecret(): string {
  return env.encryptionSecret || env.metaAppSecret;
}

function sign(value: string): string {
  const secret = stateSecret();
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET or META_APP_SECRET is required for OAuth state.");
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function createOAuthState(input: {
  platform: "facebook" | "instagram" | "instagram-basic" | "linkedin" | "twitter" | "tiktok" | "youtube";
  workspaceId: string;
  userId: string;
  codeVerifier?: string;
}): string {
  const payload: OAuthStatePayload = {
    ...input,
    nonce: randomBytes(16).toString("base64url"),
    exp: Date.now() + 10 * 60 * 1000
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyOAuthState(state: string | undefined): OAuthStatePayload {
  if (!state) {
    throw new ApiError(400, "invalid_oauth_state", "Missing OAuth state.");
  }

  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature || !safeEqual(sign(encodedPayload), signature)) {
    throw new ApiError(400, "invalid_oauth_state", "OAuth state validation failed.");
  }

  const payload = JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8")
  ) as OAuthStatePayload;

  if (!payload.workspaceId || !payload.userId || !payload.platform) {
    throw new ApiError(400, "invalid_oauth_state", "OAuth state payload is incomplete.");
  }

  if (Date.now() > payload.exp) {
    throw new ApiError(400, "expired_oauth_state", "OAuth state has expired.");
  }

  return payload;
}
