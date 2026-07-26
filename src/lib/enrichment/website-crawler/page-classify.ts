/**
 * Deterministic page classification and priority link discovery.
 */

import type { PageType } from "@/lib/enrichment/types";

const RULES: { type: PageType; patterns: RegExp[]; weight: number }[] = [
  {
    type: "contact",
    weight: 100,
    patterns: [
      /\bcontact(\s|-)?us\b/i,
      /\bcontact\b/i,
      /\bkontakt\b/i,
      /\bcontacto\b/i,
      /\bklantenservice\b/i,
      /\bimprint\b/i,
      /\bimpressum\b/i,
    ],
  },
  {
    type: "about",
    weight: 80,
    patterns: [
      /\babout(\s|-)?us\b/i,
      /\bover[\s-]?ons\b/i,
      /\bü[b]?er[\s-]?uns\b/i,
      /\bà[\s-]?propos\b/i,
      /\bnosotros\b/i,
      /\babout\b/i,
    ],
  },
  {
    type: "team",
    weight: 75,
    patterns: [
      /\bteam\b/i,
      /\bstaff\b/i,
      /\bpeople\b/i,
      /\bleadership\b/i,
      /\bmanagement\b/i,
      /\bmedewerkers\b/i,
      /\béquipe\b/i,
      /\bequipo\b/i,
    ],
  },
  {
    type: "location",
    weight: 60,
    patterns: [
      /\blocations?\b/i,
      /\bbranches?\b/i,
      /\bvestigingen\b/i,
      /\bstandorte\b/i,
      /\bimplantations\b/i,
      /\bubicaciones\b/i,
    ],
  },
  {
    type: "privacy",
    weight: 40,
    patterns: [/\bprivacy\b/i, /\bcookie\b/i, /\bgdpr\b/i],
  },
  {
    type: "legal",
    weight: 35,
    patterns: [/\blegal\b/i, /\bterms\b/i, /\bvoorwaarden\b/i, /\bagb\b/i],
  },
  {
    type: "service",
    weight: 30,
    patterns: [/\bservices?\b/i, /\bdiensten\b/i, /\bleistungen\b/i],
  },
];

export function classifyPage(input: {
  url: string;
  title?: string | null;
  anchorText?: string | null;
  isHomepage?: boolean;
}): { pageType: PageType; confidence: number; reasons: string[] } {
  if (input.isHomepage) {
    return {
      pageType: "homepage",
      confidence: 95,
      reasons: ["Root/homepage URL"],
    };
  }

  const haystack = [input.url, input.title ?? "", input.anchorText ?? ""].join(
    " ",
  );
  let best: { type: PageType; score: number; reason: string } | null = null;

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(haystack)) {
        const score = rule.weight;
        if (!best || score > best.score) {
          best = {
            type: rule.type,
            score,
            reason: `Matched ${pattern.source}`,
          };
        }
      }
    }
  }

  if (!best) {
    return { pageType: "other", confidence: 20, reasons: ["No strong signals"] };
  }

  return {
    pageType: best.type,
    confidence: Math.min(98, best.score),
    reasons: [best.reason],
  };
}

export function rankDiscoveredLinks(
  links: { href: string; text: string }[],
): { href: string; text: string; score: number; pageType: PageType }[] {
  return links
    .map((link) => {
      const classified = classifyPage({
        url: link.href,
        anchorText: link.text,
      });
      const score =
        classified.pageType === "contact"
          ? 100
          : classified.pageType === "about"
            ? 80
            : classified.pageType === "team"
              ? 75
              : classified.pageType === "location"
                ? 60
                : classified.pageType === "legal" ||
                    classified.pageType === "privacy"
                  ? 45
                  : 10;
      return {
        href: link.href,
        text: link.text,
        score,
        pageType: classified.pageType,
      };
    })
    .filter((item) => item.score >= 45)
    .sort((a, b) => b.score - a.score);
}
