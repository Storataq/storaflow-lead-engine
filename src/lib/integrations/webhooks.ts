/**
 * Webhook architecture helpers — signature validation + retry scaffolding.
 */

import { createHmac, timingSafeEqual } from "crypto";

export function signWebhookPayload(
  secret: string,
  body: string,
  algo: "hmac_sha256" = "hmac_sha256",
): string {
  void algo;
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

export function verifyWebhookSignature(input: {
  secret: string;
  body: string;
  signatureHeader: string;
  tolerancePrefix?: string;
}): boolean {
  const expected = signWebhookPayload(input.secret, input.body);
  const provided = input.signatureHeader
    .replace(input.tolerancePrefix ?? "sha256=", "")
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

export function nextWebhookRetryAt(attempt: number, now = new Date()): Date {
  // Exponential backoff: 1m, 5m, 15m, 1h, 6h
  const minutes = [1, 5, 15, 60, 360][Math.min(attempt, 4)] ?? 360;
  return new Date(now.getTime() + minutes * 60_000);
}
