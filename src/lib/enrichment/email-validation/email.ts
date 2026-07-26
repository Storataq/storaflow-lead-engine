/**
 * Email discovery, normalization, syntax validation and confidence scoring.
 */

import type {
  EmailCategory,
  EmailConfidenceClass,
  EmailSyntaxStatus,
  PageType,
} from "@/lib/enrichment/types";

const ROLE_LOCALS = new Set([
  "info",
  "sales",
  "contact",
  "support",
  "hello",
  "office",
  "admin",
  "administratie",
  "klantenservice",
  "billing",
  "jobs",
  "careers",
  "hr",
  "press",
  "media",
]);

const PLACEHOLDER_PATTERNS = [
  /example\.com$/i,
  /email@/i,
  /yourname@/i,
  /domain\.com$/i,
  /test@/i,
];

export function deobfuscatePublicEmail(raw: string): string {
  return raw
    .replace(/\s*\[at\]\s*/gi, "@")
    .replace(/\s*\(at\)\s*/gi, "@")
    .replace(/\s+at\s+/gi, "@")
    .replace(/\s*\[dot\]\s*/gi, ".")
    .replace(/\s*\(dot\)\s*/gi, ".")
    .replace(/\s+dot\s+/gi, ".")
    .replace(/\s+@\s+/g, "@")
    .trim();
}

export function normalizeEmail(raw: string): string {
  return deobfuscatePublicEmail(raw)
    .replace(/^mailto:/i, "")
    .replace(/[<>]/g, "")
    .trim()
    .toLowerCase();
}

export function extractEmailsFromText(text: string): string[] {
  const found = new Set<string>();
  const regex =
    /([a-z0-9._%+-]+(?:\s*(?:\[at\]|\(at\)|@)\s*)[a-z0-9.-]+(?:\s*(?:\[dot\]|\(dot\)|\.)\s*)[a-z]{2,})/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const normalized = normalizeEmail(match[1] ?? "");
    if (normalized.includes("@")) found.add(normalized);
  }
  return [...found];
}

export function validateEmailSyntax(email: string): EmailSyntaxStatus {
  const value = normalizeEmail(email);
  if (!value || value.length > 254) return "invalid_syntax";
  if (PLACEHOLDER_PATTERNS.some((p) => p.test(value))) return "placeholder";
  const parts = value.split("@");
  if (parts.length !== 2) return "invalid_syntax";
  const [local, domain] = parts;
  if (!local || !domain) return "invalid_syntax";
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return "invalid_syntax";
  }
  if (!/^[a-z0-9._%+-]+$/i.test(local)) return "invalid_syntax";
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return "invalid_syntax";
  if (ROLE_LOCALS.has(local.toLowerCase())) return "role_address";
  if (/[0-9]{5,}/.test(local)) return "suspicious";
  return "valid_syntax";
}

export function categorizeEmail(email: string): EmailCategory {
  const local = normalizeEmail(email).split("@")[0] ?? "";
  if (["sales", "verkoop"].includes(local)) return "sales";
  if (["support", "help", "klantenservice"].includes(local)) return "support";
  if (["info", "information", "hello", "contact", "office"].includes(local)) {
    return "information";
  }
  if (["admin", "administratie", "office"].includes(local)) {
    return "administration";
  }
  if (["billing", "facturen", "finance"].includes(local)) return "billing";
  if (["jobs", "careers", "hr", "vacatures"].includes(local)) return "careers";
  if (["press", "media"].includes(local)) return "press";
  if (ROLE_LOCALS.has(local)) return "general";
  if (local.includes(".")) return "personal";
  return "unknown";
}

export function scoreEmailConfidence(input: {
  email: string;
  syntaxStatus: EmailSyntaxStatus;
  companyDomain: string | null;
  sourcePageType: PageType;
  fromMailto: boolean;
  occurrences: number;
}): {
  confidence: number;
  confidenceClass: EmailConfidenceClass;
  factors: string[];
} {
  const factors: string[] = [];
  let score = 0;
  const domain = normalizeEmail(input.email).split("@")[1] ?? "";

  if (input.syntaxStatus === "invalid_syntax" || input.syntaxStatus === "placeholder") {
    return {
      confidence: 0,
      confidenceClass: "invalid",
      factors: [`Syntax: ${input.syntaxStatus}`],
    };
  }

  if (input.syntaxStatus === "valid_syntax" || input.syntaxStatus === "role_address") {
    score += 35;
    factors.push("Valid syntax");
  } else {
    score += 15;
    factors.push(`Syntax: ${input.syntaxStatus}`);
  }

  if (input.companyDomain && domain.replace(/^www\./, "") === input.companyDomain) {
    score += 25;
    factors.push("Same domain as company website");
  }

  if (input.fromMailto) {
    score += 15;
    factors.push("Found in mailto link");
  }

  if (input.sourcePageType === "contact") {
    score += 12;
    factors.push("Found on contact page");
  } else if (input.sourcePageType === "legal" || input.sourcePageType === "privacy") {
    score += 8;
    factors.push("Found on legal/privacy page");
  } else if (input.sourcePageType === "about" || input.sourcePageType === "team") {
    score += 6;
    factors.push(`Found on ${input.sourcePageType} page`);
  }

  if (input.occurrences > 1) {
    score += 8;
    factors.push("Seen on multiple pages");
  }

  if (input.syntaxStatus === "role_address") {
    score += 5;
    factors.push("Role/general inbox address");
  }

  if (input.syntaxStatus === "suspicious") {
    score -= 10;
    factors.push("Suspicious local-part pattern");
  }

  score = Math.max(0, Math.min(100, score));
  const confidenceClass: EmailConfidenceClass =
    score >= 75 ? "high" : score >= 50 ? "medium" : score >= 25 ? "low" : "unknown";

  return { confidence: score, confidenceClass, factors };
}

/**
 * Optional DNS MX check — best effort; never proves mailbox deliverability.
 */
export async function checkDomainMx(
  domain: string,
): Promise<"mx_available" | "no_mx" | "dns_failure" | "unknown"> {
  // Node dns is available in server runtime; keep optional and soft-fail.
  try {
    const dns = await import("node:dns/promises");
    const records = await dns.resolveMx(domain);
    if (records?.length) return "mx_available";
    return "no_mx";
  } catch {
    return "unknown";
  }
}
