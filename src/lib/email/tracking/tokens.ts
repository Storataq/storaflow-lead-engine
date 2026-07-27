import { createHmac, timingSafeEqual } from "crypto";

type OpenTokenPayload = {
  q: string;
  r: string;
};

function getTrackingSecret(): string {
  const secret = process.env.EMAIL_TRACKING_SECRET?.trim();
  if (!secret) {
    throw new Error("EMAIL_TRACKING_SECRET is not configured.");
  }
  return secret;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string): string {
  return createHmac("sha256", getTrackingSecret())
    .update(value)
    .digest("base64url");
}

export function createOpenTrackingToken(payload: OpenTokenPayload): string {
  const body = encodeBase64Url(JSON.stringify(payload));
  const signature = signValue(body);
  return `${body}.${signature}`;
}

export function verifyOpenTrackingToken(
  token: string,
): OpenTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = signValue(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(body)) as OpenTokenPayload;
  } catch {
    return null;
  }
}

export function buildTrackedReplyToAddress(input: {
  queueItemId: string;
  fallbackReplyTo: string | null;
}): string | null {
  const baseAddress = process.env.EMAIL_REPLY_BASE_ADDRESS?.trim();
  if (!baseAddress || !baseAddress.includes("@")) {
    return input.fallbackReplyTo;
  }

  const [localPart, domain] = baseAddress.split("@");
  return `${localPart}+q.${input.queueItemId}@${domain}`;
}

export function parseTrackedReplyToAddress(email: string | null): string | null {
  if (!email) return null;
  const match = email.toLowerCase().match(/\+q\.([0-9a-f-]{36})@/);
  return match?.[1] ?? null;
}

