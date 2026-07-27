/**
 * Device / UA parsing + fingerprint helpers (no heavy deps).
 */

export function parseUserAgent(ua: string | null | undefined): {
  browser: string;
  operatingSystem: string;
  deviceName: string;
  platform: string;
} {
  const value = ua?.trim() || "";
  let browser = "Unknown browser";
  if (/edg\//i.test(value)) browser = "Edge";
  else if (/chrome\//i.test(value) && !/edg\//i.test(value)) browser = "Chrome";
  else if (/firefox\//i.test(value)) browser = "Firefox";
  else if (/safari\//i.test(value) && !/chrome\//i.test(value))
    browser = "Safari";

  let operatingSystem = "Unknown OS";
  if (/windows/i.test(value)) operatingSystem = "Windows";
  else if (/mac os x|macintosh/i.test(value)) operatingSystem = "macOS";
  else if (/android/i.test(value)) operatingSystem = "Android";
  else if (/iphone|ipad|ios/i.test(value)) operatingSystem = "iOS";
  else if (/linux/i.test(value)) operatingSystem = "Linux";

  const platform = operatingSystem;
  const deviceName = `${browser} on ${operatingSystem}`;
  return { browser, operatingSystem, deviceName, platform };
}

export async function hashToken(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function deviceFingerprintFrom(
  userAgent: string,
  extra?: string | null,
): string {
  const base = `${userAgent}|${extra ?? ""}`.slice(0, 500);
  // sync lightweight hash for fingerprint key (not cryptographic identity)
  let h = 0;
  for (let i = 0; i < base.length; i++) {
    h = (h << 5) - h + base.charCodeAt(i);
    h |= 0;
  }
  return `fp_${Math.abs(h).toString(16)}_${base.length}`;
}

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    const part = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 10)
      .toUpperCase();
    codes.push(`${part.slice(0, 5)}-${part.slice(5)}`);
  }
  return codes;
}
