/**
 * OAuth 2.0 helpers — authorize URL + token exchange scaffolding.
 * Live provider credentials come from env; tokens encrypted at rest.
 */

import { createHash, randomBytes } from "crypto";

import type { IntegrationManifest } from "@/lib/integrations/types";

export function createOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildOAuthAuthorizeUrl(input: {
  manifest: IntegrationManifest;
  redirectUri: string;
  state: string;
  codeChallenge?: string;
}): string | null {
  const oauth = input.manifest.oauth;
  if (!oauth) return null;
  const clientId = process.env[oauth.clientIdEnv]?.trim();
  if (!clientId) return null;

  const url = new URL(oauth.authorizeUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  url.searchParams.set("scope", oauth.scopes.join(" "));
  if (oauth.pkce && input.codeChallenge) {
    url.searchParams.set("code_challenge", input.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  return url.toString();
}

export type TokenExchangeResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  raw: Record<string, unknown>;
};

/**
 * Exchange authorization code for tokens.
 * Returns null when provider credentials are not configured (dev-safe).
 */
export async function exchangeAuthorizationCode(input: {
  manifest: IntegrationManifest;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<TokenExchangeResult | null> {
  const oauth = input.manifest.oauth;
  if (!oauth) return null;
  const clientId = process.env[oauth.clientIdEnv]?.trim();
  const clientSecret = process.env[oauth.clientSecretEnv]?.trim();
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (input.codeVerifier) body.set("code_verifier", input.codeVerifier);

  const res = await fetch(oauth.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, unknown>;
  const accessToken = String(json.access_token ?? "");
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: json.refresh_token ? String(json.refresh_token) : undefined,
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : undefined,
    scope: json.scope ? String(json.scope) : undefined,
    raw: json,
  };
}

export async function refreshAccessToken(input: {
  manifest: IntegrationManifest;
  refreshToken: string;
}): Promise<TokenExchangeResult | null> {
  const oauth = input.manifest.oauth;
  if (!oauth) return null;
  const clientId = process.env[oauth.clientIdEnv]?.trim();
  const clientSecret = process.env[oauth.clientSecretEnv]?.trim();
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(oauth.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, unknown>;
  const accessToken = String(json.access_token ?? "");
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: json.refresh_token
      ? String(json.refresh_token)
      : input.refreshToken,
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : undefined,
    scope: json.scope ? String(json.scope) : undefined,
    raw: json,
  };
}
