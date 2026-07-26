/**
 * Website URL normalization for enrichment.
 */

import { assertSafeHttpUrl, isBlockedHostname } from "@/lib/enrichment/website-crawler/url-safety";
import type { NormalizedWebsiteUrl } from "@/lib/enrichment/types";

export function normalizeWebsiteUrl(input: string): NormalizedWebsiteUrl {
  const original = input.trim();
  if (!original) {
    return {
      original,
      normalized: "",
      finalUrl: null,
      domain: null,
      hostname: null,
      protocol: null,
      origin: null,
      path: "/",
      redirectCount: 0,
      status: "invalid",
      reason: "Empty URL",
    };
  }

  let candidate = original;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        original,
        normalized: "",
        finalUrl: null,
        domain: null,
        hostname: null,
        protocol: url.protocol,
        origin: null,
        path: "/",
        redirectCount: 0,
        status: "invalid",
        reason: `Unsupported scheme ${url.protocol}`,
      };
    }

    if (isBlockedHostname(url.hostname)) {
      return {
        original,
        normalized: "",
        finalUrl: null,
        domain: null,
        hostname: url.hostname,
        protocol: url.protocol,
        origin: null,
        path: "/",
        redirectCount: 0,
        status: "blocked_ssrf",
        reason: "Private or local address blocked",
      };
    }

    url.hash = "";
    // Drop common tracking query params but keep meaningful ones lightly:
    // strip all query for canonical root comparison; keep path.
    url.search = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    const normalized = url.toString();
    assertSafeHttpUrl(normalized);

    const host = url.hostname.replace(/^www\./, "");
    return {
      original,
      normalized,
      finalUrl: null,
      domain: host,
      hostname: url.hostname,
      protocol: url.protocol.replace(":", ""),
      origin: url.origin,
      path: url.pathname || "/",
      redirectCount: 0,
      status: "ok",
    };
  } catch (error) {
    return {
      original,
      normalized: "",
      finalUrl: null,
      domain: null,
      hostname: null,
      protocol: null,
      origin: null,
      path: "/",
      redirectCount: 0,
      status: "invalid",
      reason: error instanceof Error ? error.message : "Invalid URL",
    };
  }
}
