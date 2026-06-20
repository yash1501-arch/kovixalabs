import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const passwordKeyLength = 64;
export const authSessionDays = 30;

export function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "workspace";
}

export function createWorkspaceSlug(workspaceName: string): string {
  return `${slugify(workspaceName)}-${randomUUID().slice(0, 8)}`;
}

export function createWorkspaceName(name: string, requestedName?: string): string {
  const trimmedRequestedName = requestedName?.trim();
  if (trimmedRequestedName) return trimmedRequestedName;
  return `${name.trim()} Workspace`;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, passwordKeyLength)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, hash] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const storedKey = Buffer.from(hash, "hex");
  const derivedKey = (await scryptAsync(password, salt, passwordKeyLength)) as Buffer;
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

export function createRawAuthToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAuthToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionExpiry(): Date {
  return new Date(Date.now() + authSessionDays * 24 * 60 * 60 * 1000);
}

export function toPrismaJson(value: unknown): any {
  return JSON.parse(JSON.stringify(value));
}

export function toIso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}
