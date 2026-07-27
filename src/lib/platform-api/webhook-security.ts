/**
 * Outbound webhook signing — HMAC-SHA256 + timestamp (replay-protection ready).
 */

import { createHmac, timingSafeEqual, randomBytes } from "crypto";

import {
  encryptSecret,
  decryptSecret,
  redactToken,
} from "@/lib/integrations/crypto";
import { nextWebhookRetryAt } from "@/lib/integrations/webhooks";

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export function encryptWebhookSecret(plaintext: string) {
  const enc = encryptSecret(plaintext);
  return {
    ...enc,
    prefix: redactToken(plaintext),
  };
}

export function decryptWebhookSecret(input: {
  ciphertextBase64: string;
  ivBase64: string;
  authTagBase64: string;
  keyVersion: number;
}): string {
  return decryptSecret(input);
}

export function signPlatformWebhook(input: {
  secret: string;
  timestamp: string;
  body: string;
}): string {
  const base = `${input.timestamp}.${input.body}`;
  return createHmac("sha256", input.secret).update(base, "utf8").digest("hex");
}

export function verifyPlatformWebhookSignature(input: {
  secret: string;
  timestamp: string;
  body: string;
  signatureHeader: string;
  toleranceSeconds?: number;
  now?: number;
}): boolean {
  const tolerance = input.toleranceSeconds ?? 300;
  const now = input.now ?? Date.now();
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(now / 1000 - ts) > tolerance) return false;

  const expected = signPlatformWebhook({
    secret: input.secret,
    timestamp: input.timestamp,
    body: input.body,
  });
  const provided = input.signatureHeader
    .replace(/^sha256=/i, "")
    .trim();
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function assertHttpsUrl(url: string, httpsOnly: boolean): string | null {
  try {
    const parsed = new URL(url);
    if (httpsOnly && parsed.protocol !== "https:") {
      return "Webhook URL must use HTTPS.";
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "Invalid webhook URL protocol.";
    }
    return null;
  } catch {
    return "Invalid webhook URL.";
  }
}

export { nextWebhookRetryAt };
