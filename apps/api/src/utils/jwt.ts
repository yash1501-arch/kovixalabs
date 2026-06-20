import { createHmac, randomBytes } from "node:crypto";
import { env } from "../config.js";

export type JwtPayload = {
  sub: string;
  email: string;
  name: string | null;
  workspaceId: string;
  role: string;
  iat: number;
  exp: number;
};

function jwtSecret(): string {
  const secret = env.encryptionSecret;
  if (!secret) throw new Error("ENCRYPTION_SECRET is required for JWT signing.");
  return secret;
}

function readSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET or JWT_SECRET is required for JWT.");
  return secret;
}

function base64url(input: string): string {
  return Buffer.from(input)
    .toString("base64url")
    .replace(/=+$/, "");
}

function fromBase64url(input: string): string {
  const padded = input.length % 4 === 3 ? input : input + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64url").toString("utf8");
}

export function signJwt(payload: Omit<JwtPayload, "iat">): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }));
  const signature = createHmac("sha256", jwtSecret()).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const header = parts[0]!;
  const body = parts[1]!;
  const signature = parts[2]!;
  const expectedSig = createHmac("sha256", jwtSecret()).update(`${header}.${body}`).digest("base64url");

  if (signature !== expectedSig) throw new Error("Invalid JWT signature");

  const payload = JSON.parse(fromBase64url(body)) as JwtPayload;
  if (Date.now() > payload.exp * 1000) throw new Error("JWT has expired");

  return payload;
}

export function createAuthTokens(userId: string, workspaceId: string, role: string, email = "", name: string | null = null) {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = signJwt({
    sub: userId,
    email,
    name,
    workspaceId,
    role,
    exp: now + 24 * 60 * 60,
  });
  const refreshToken = signJwt({
    sub: userId,
    email,
    name,
    workspaceId,
    role,
    exp: now + 30 * 24 * 60 * 60,
  });
  return { accessToken, refreshToken, expiresAt: new Date((now + 24 * 60 * 60) * 1000).toISOString() };
}

export function createDemoTokens(userId: string, workspaceId: string) {
  return createAuthTokens(userId, workspaceId, "owner");
}
