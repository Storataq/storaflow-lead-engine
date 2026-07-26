/**
 * robots.txt policy helper (best-effort, non-bypass).
 */

import { assertSafeHttpUrl } from "@/lib/enrichment/website-crawler/url-safety";
import { DEFAULT_USER_AGENT } from "@/lib/constants";

export type RobotsPolicyResult = {
  fetched: boolean;
  disallowed: string[];
  message: string;
};

function parseDisallow(body: string, userAgent: string): string[] {
  const lines = body.split(/\r?\n/);
  let inRelevant = false;
  const disallowed: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("user-agent:")) {
      const value = line.slice("user-agent:".length).trim().toLowerCase();
      inRelevant = value === "*" || userAgent.toLowerCase().includes(value);
      continue;
    }
    if (!inRelevant) continue;
    if (lower.startsWith("disallow:")) {
      const path = line.slice("disallow:".length).trim();
      if (path) disallowed.push(path);
    }
  }
  return disallowed;
}

export function isPathDisallowed(pathname: string, disallowed: string[]): boolean {
  return disallowed.some((rule) => {
    if (rule === "/") return true;
    return pathname.startsWith(rule);
  });
}

export async function fetchRobotsPolicy(
  origin: string,
): Promise<RobotsPolicyResult> {
  try {
    const robotsUrl = new URL("/robots.txt", origin).toString();
    assertSafeHttpUrl(robotsUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(robotsUrl, {
        method: "GET",
        headers: { "User-Agent": DEFAULT_USER_AGENT, Accept: "text/plain,*/*" },
        signal: controller.signal,
        redirect: "follow",
        cache: "no-store",
      });
      if (!response.ok) {
        return {
          fetched: false,
          disallowed: [],
          message: `robots.txt HTTP ${response.status} — continuing with safe defaults`,
        };
      }
      const text = await response.text();
      const disallowed = parseDisallow(text, DEFAULT_USER_AGENT);
      return {
        fetched: true,
        disallowed,
        message:
          disallowed.length > 0
            ? `robots.txt loaded (${disallowed.length} disallow rules)`
            : "robots.txt loaded (no disallow rules for crawler)",
      };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return {
      fetched: false,
      disallowed: [],
      message: "robots.txt unavailable — continuing with safe defaults",
    };
  }
}
