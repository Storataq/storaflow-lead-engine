/**
 * API key generation — store hash only; return plaintext once.
 */

import { createHash, randomBytes } from "crypto";

import { API_KEY_PREFIX } from "@/lib/platform-api/constants";

export function generateApiKeyMaterial(): {
  plaintext: string;
  prefix: string;
  hash: string;
} {
  const secret = randomBytes(24).toString("base64url");
  const plaintext = `${API_KEY_PREFIX}${secret}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 12),
    hash: hashApiKey(plaintext),
  };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (match?.[1]) return match[1].trim();
  }
  const alt = request.headers.get("x-api-key")?.trim();
  return alt || null;
}
