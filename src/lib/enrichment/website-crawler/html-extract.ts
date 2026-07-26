/**
 * Lightweight HTML extraction without a DOM dependency.
 */

import type { SocialPlatform } from "@/lib/enrichment/types";

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function stripHtmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeEntities(match[1]).trim() : null;
}

export function extractMetaDescription(html: string): string | null {
  const match = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  );
  return match?.[1] ? decodeEntities(match[1]).trim() : null;
}

export function extractLinks(
  html: string,
  baseUrl: string,
): { href: string; text: string }[] {
  const results: { href: string; text: string }[] = [];
  const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const hrefRaw = match[1]?.trim();
    if (!hrefRaw || hrefRaw.startsWith("#") || hrefRaw.startsWith("mailto:") || hrefRaw.startsWith("tel:")) {
      continue;
    }
    try {
      const absolute = new URL(hrefRaw, baseUrl).toString();
      const text = stripHtmlToText(match[2] ?? "").slice(0, 120);
      results.push({ href: absolute, text });
    } catch {
      // ignore bad href
    }
  }
  return results;
}

export function extractMailto(html: string): string[] {
  const found = new Set<string>();
  const regex = /mailto:([^"'?\s>]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const email = decodeURIComponent(match[1] ?? "").trim();
    if (email) found.add(email);
  }
  return [...found];
}

export function extractTel(html: string): string[] {
  const found = new Set<string>();
  const regex = /tel:([^"'?\s>]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const phone = decodeURIComponent(match[1] ?? "").trim();
    if (phone) found.add(phone);
  }
  return [...found];
}

const SOCIAL_HOSTS: { platform: SocialPlatform; host: RegExp }[] = [
  { platform: "linkedin", host: /linkedin\.com/i },
  { platform: "facebook", host: /facebook\.com|fb\.com/i },
  { platform: "instagram", host: /instagram\.com/i },
  { platform: "twitter", host: /twitter\.com|x\.com/i },
  { platform: "youtube", host: /youtube\.com|youtu\.be/i },
  { platform: "tiktok", host: /tiktok\.com/i },
  { platform: "pinterest", host: /pinterest\.com/i },
  { platform: "github", host: /github\.com/i },
];

export function extractSocialLinks(
  links: { href: string }[],
): { platform: SocialPlatform; url: string }[] {
  const out: { platform: SocialPlatform; url: string }[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    try {
      const url = new URL(link.href);
      const hit = SOCIAL_HOSTS.find((item) => item.host.test(url.hostname));
      if (!hit) continue;
      const key = `${hit.platform}|${url.origin}${url.pathname}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ platform: hit.platform, url: url.toString() });
    } catch {
      // ignore
    }
  }
  return out;
}

export function extractJsonLdStrings(html: string): string[] {
  const blocks: string[] = [];
  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    if (match[1]) blocks.push(match[1]);
  }
  return blocks;
}

export function extractEmailsFromJsonLd(blocks: string[]): string[] {
  const emails = new Set<string>();
  for (const block of blocks) {
    try {
      const data = JSON.parse(block) as unknown;
      walk(data, (value) => {
        if (typeof value === "string" && value.includes("@")) {
          emails.add(value);
        }
      });
    } catch {
      // ignore malformed json-ld
    }
  }
  return [...emails];
}

export function extractPhonesFromJsonLd(blocks: string[]): string[] {
  const phones = new Set<string>();
  for (const block of blocks) {
    try {
      const data = JSON.parse(block) as unknown;
      walk(data, (value, key) => {
        if (
          typeof value === "string" &&
          (key === "telephone" || key === "phone" || key === "tel")
        ) {
          phones.add(value);
        }
      });
    } catch {
      // ignore
    }
  }
  return [...phones];
}

function walk(
  value: unknown,
  visit: (value: unknown, key?: string) => void,
  key?: string,
): void {
  visit(value, key);
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      walk(child, visit, childKey);
    }
  }
}
