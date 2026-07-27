/**
 * AES-256-GCM secret encryption for integration credentials.
 * Tokens never leave the server; ciphertext stored in DB.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

export type EncryptedSecret = {
  ciphertextBase64: string;
  ivBase64: string;
  authTagBase64: string;
  keyVersion: number;
};

function resolveKey(): Buffer {
  const raw =
    process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim() ||
    process.env.EMAIL_TRACKING_SECRET?.trim() ||
    "";
  if (!raw) {
    // Deterministic fallback for local/dev only — production must set INTEGRATIONS_ENCRYPTION_KEY
    return createHash("sha256")
      .update("storaflow-integrations-dev-key")
      .digest();
  }
  // Accept 32-byte base64 or derive from arbitrary string
  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
  } catch {
    /* fall through */
  }
  return createHash("sha256").update(raw).digest();
}

export function isIntegrationsEncryptionConfigured(): boolean {
  return Boolean(process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim());
}

export function encryptSecret(plaintext: string): EncryptedSecret {
  const key = resolveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertextBase64: encrypted.toString("base64"),
    ivBase64: iv.toString("base64"),
    authTagBase64: authTag.toString("base64"),
    keyVersion: 1,
  };
}

export function decryptSecret(payload: EncryptedSecret): string {
  const key = resolveKey();
  const iv = Buffer.from(payload.ivBase64, "base64");
  const authTag = Buffer.from(payload.authTagBase64, "base64");
  const ciphertext = Buffer.from(payload.ciphertextBase64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Redact for logs/diagnostics — never log full tokens */
export function redactToken(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
