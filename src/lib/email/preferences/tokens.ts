/**
 * Preference / unsubscribe token helpers — Phase 21I.
 * Opaque public tokens stored server-side; signed payload references token id only.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

import type { PreferenceTokenPurpose } from "@/lib/email/preferences/constants";

type SignedPreferenceClaims = {
  v: number;
  tid: string;
  p: PreferenceTokenPurpose;
  exp?: number;
  n: string;
};

function getPreferenceSecret(): string {
  const secret =
    process.env.EMAIL_PREFERENCE_TOKEN_SECRET?.trim() ||
    process.env.EMAIL_TRACKING_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "EMAIL_PREFERENCE_TOKEN_SECRET (or EMAIL_TRACKING_SECRET fallback) is not configured.",
    );
  }
  return secret;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signBody(body: string): string {
  return createHmac("sha256", getPreferenceSecret())
    .update(body)
    .digest("base64url");
}

export function createOpaquePublicToken(): string {
  return randomBytes(32).toString("base64url");
}

export function signPreferenceAccessToken(input: {
  tokenId: string;
  purpose: PreferenceTokenPurpose;
  expiresAt?: string | null;
  version?: number;
}): string {
  const claims: SignedPreferenceClaims = {
    v: input.version ?? 1,
    tid: input.tokenId,
    p: input.purpose,
    n: randomBytes(8).toString("hex"),
  };
  if (input.expiresAt) {
    claims.exp = Math.floor(new Date(input.expiresAt).getTime() / 1000);
  }
  const body = encodeBase64Url(JSON.stringify(claims));
  return `${body}.${signBody(body)}`;
}

export function verifyPreferenceAccessToken(
  token: string,
): SignedPreferenceClaims | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = signBody(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const claims = JSON.parse(decodeBase64Url(body)) as SignedPreferenceClaims;
    if (!claims.tid || !claims.p) return null;
    if (claims.exp && claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

export function hashPreferenceMeta(value: string | null | undefined): string | null {
  if (!value) return null;
  if (process.env.EMAIL_PREFERENCE_STORE_IP !== "true") {
    // Still hash when provided for rate/dedupe, but callers should pass null when disabled.
  }
  const secret = getPreferenceSecret();
  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

export function getPreferenceBaseUrl(): string {
  return (
    process.env.EMAIL_PREFERENCE_BASE_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function ttlDays(envName: string, fallback: number): number {
  const raw = process.env[envName]?.trim();
  const n = raw ? Number(raw) : fallback;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function ttlHours(envName: string, fallback: number): number {
  return ttlDays(envName, fallback);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  if (local.length <= 2) return `${local[0] ?? "*"}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export function buildPreferenceCenterUrl(signedToken: string): string {
  return `${getPreferenceBaseUrl()}/preferences/${encodeURIComponent(signedToken)}`;
}

export function buildUnsubscribePageUrl(signedToken: string): string {
  return `${getPreferenceBaseUrl()}/unsubscribe/${encodeURIComponent(signedToken)}`;
}

export function buildOneClickUnsubscribeUrl(signedToken: string): string {
  return `${getPreferenceBaseUrl()}/api/email/unsubscribe/one-click/${encodeURIComponent(signedToken)}`;
}

export function buildResubscribeUrl(signedToken: string): string {
  return `${getPreferenceBaseUrl()}/preferences/resubscribe/${encodeURIComponent(signedToken)}`;
}
