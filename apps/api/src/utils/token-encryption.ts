import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config.js";

const algorithm = "aes-256-gcm";
const tokenPrefix = "enc:v1";

function encryptionKey(): Buffer {
  if (!env.encryptionSecret || env.encryptionSecret.length < 32) {
    throw new Error("ENCRYPTION_SECRET must be at least 32 characters long.");
  }

  return createHash("sha256").update(env.encryptionSecret).digest();
}

export function isEncryptedToken(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(`${tokenPrefix}:`));
}

export function encryptToken(token: string): string {
  if (isEncryptedToken(token)) {
    return token;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return [
    tokenPrefix,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url")
  ].join(":");
}

export function decryptToken(token: string): string {
  if (!isEncryptedToken(token)) {
    return token;
  }

  const [, , ivValue, authTagValue, ciphertextValue] = token.split(":");
  if (!ivValue || !authTagValue || !ciphertextValue) {
    throw new Error("Encrypted token payload is malformed.");
  }

  const decipher = createDecipheriv(
    algorithm,
    encryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
}
