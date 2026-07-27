/**
 * Website HTML → company analysis signals (deterministic, AI-optional polish).
 */

import { classifyBusiness } from "@/lib/prospecting/classify";
import type { CompanyAnalysisResult } from "@/lib/prospecting/types";

function unique(items: string[], max = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = item.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function extractEmails(text: string): string[] {
  return unique(
    (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? []).filter(
      (e) => !/example\.com|sentry\.|wixpress|cloudflare/i.test(e),
    ),
    8,
  );
}

function extractPhones(text: string): string[] {
  return unique(
    text.match(/(?:\+|00)?[\d\s().-]{8,18}\d/g)?.map((p) => p.trim()) ?? [],
    6,
  );
}

function extractSocial(html: string): Record<string, string> {
  const social: Record<string, string> = {};
  const patterns: Array<[string, RegExp]> = [
    ["linkedin", /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^\s"'<>]+/i],
    ["facebook", /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i],
    ["instagram", /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i],
    ["twitter", /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>]+/i],
  ];
  for (const [key, pattern] of patterns) {
    const match = html.match(pattern);
    if (match?.[0]) social[key] = match[0].replace(/["'].*$/, "");
  }
  return social;
}

function extractListItems(text: string, keywords: RegExp): string[] {
  const lines = text
    .split(/[\n•|-]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 8 && l.length < 120 && keywords.test(l));
  return unique(lines, 8);
}

const TECH_PATTERNS: Array<[string, RegExp]> = [
  ["Shopify", /shopify/i],
  ["WooCommerce", /woocommerce/i],
  ["WordPress", /wordpress|wp-content/i],
  ["Webflow", /webflow/i],
  ["HubSpot", /hubspot/i],
  ["Salesforce", /salesforce/i],
  ["Google Analytics", /google-analytics|gtag\/js|googletagmanager/i],
  ["Stripe", /stripe/i],
  ["Magento", /magento/i],
];

export function analyzeWebsiteContent(params: {
  companyName: string;
  websiteUrl?: string | null;
  html: string;
  text: string;
}): CompanyAnalysisResult {
  const hay = `${params.companyName}\n${params.text}`.slice(0, 40_000);
  const classification = classifyBusiness(hay);
  const emails = extractEmails(hay);
  const phones = extractPhones(hay);
  const social = extractSocial(params.html);
  const technologies = TECH_PATTERNS.filter(([, re]) =>
    re.test(params.html) || re.test(hay),
  ).map(([name]) => name);

  const products = extractListItems(hay, /product|oplossing|solution|dienst/i);
  const services = extractListItems(hay, /service|dienst|advies|support/i);
  const usps = extractListItems(
    hay,
    /uniek|waarom|voordeel|snel|betrouwbaar|kwaliteit|innovati/i,
  );

  const audienceMatch = /\b(b2b|zakelijk|bedrijven)\b/i.test(hay)
    ? "B2B"
    : /\b(b2c|consument|particulier)\b/i.test(hay)
      ? "B2C"
      : "Onbekend";

  const whatTheyDo =
    params.text
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 320) ||
    `${params.companyName} is actief in ${classification.businessClass}.`;

  const summary = [
    whatTheyDo,
    technologies.length
      ? `Gesignaleerde technologie: ${technologies.slice(0, 5).join(", ")}.`
      : null,
    emails[0] || phones[0]
      ? `Contactsignalen: ${[emails[0], phones[0]].filter(Boolean).join(" / ")}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    summary,
    whatTheyDo,
    products,
    services,
    audience: audienceMatch,
    usps,
    technologies,
    socialHints: social,
    contactHints: { emails, phones },
    businessClass: classification.businessClass,
    industry: classification.businessClass,
    confidence: classification.confidence,
  };
}

export function estimateDigitalMaturity(params: {
  hasWebsite: boolean;
  technologies: string[];
  hasEmail: boolean;
  hasPhone: boolean;
  hasSocial: boolean;
  htmlLength: number;
}): number {
  let score = 10;
  if (params.hasWebsite) score += 25;
  score += Math.min(30, params.technologies.length * 6);
  if (params.hasEmail) score += 10;
  if (params.hasPhone) score += 8;
  if (params.hasSocial) score += 8;
  if (params.htmlLength > 20_000) score += 10;
  else if (params.htmlLength > 5_000) score += 5;
  return Math.max(0, Math.min(100, score));
}

export function websiteLooksOutdated(html: string, text: string): boolean {
  const hay = `${html}\n${text}`.toLowerCase();
  if (/flash|marquee|document\.write|tables for layout/i.test(hay)) return true;
  if (hay.length < 800) return true;
  if (!/viewport|responsive|flex|grid/i.test(html) && html.length > 0) return true;
  return false;
}
