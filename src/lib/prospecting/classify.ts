/**
 * Business classification from text signals.
 */

import {
  BUSINESS_CLASSES,
  type BusinessClass,
} from "@/lib/prospecting/constants";

const RULES: Array<{ cls: BusinessClass; patterns: RegExp[] }> = [
  {
    cls: "software",
    patterns: [/saas|software|app\b|cloud|platform|api\b|devops|it\b/i],
  },
  {
    cls: "retail",
    patterns: [/retail|winkel|shop|store|e-?commerce|webshop/i],
  },
  {
    cls: "manufacturing",
    patterns: [/manufactur|fabriek|production|industrial|assembl/i],
  },
  {
    cls: "healthcare",
    patterns: [/health|zorg|medical|kliniek|hospital|pharma/i],
  },
  {
    cls: "hospitality",
    patterns: [/hotel|horeca|restaurant|catering|hospitality|booking/i],
  },
  {
    cls: "automotive",
    patterns: [/auto|garage|vehicle|car\b|fleet|mobility/i],
  },
  {
    cls: "wholesale",
    patterns: [/wholesale|groothandel|b2b distribution|distributor/i],
  },
  {
    cls: "logistics",
    patterns: [/logist|transport|warehouse|fulfil|shipping|fulfillment/i],
  },
  {
    cls: "construction",
    patterns: [/bouw|construction|contractor|installatie|renovatie/i],
  },
  {
    cls: "education",
    patterns: [/school|universit|education|training|opleiding|academy/i],
  },
  {
    cls: "finance",
    patterns: [/bank|financ|insurance|verzeker|fintech|accounting/i],
  },
  {
    cls: "food",
    patterns: [/food|voedsel|bakery|brewery|dranken|horeca food/i],
  },
  {
    cls: "nonprofit",
    patterns: [/non[- ]?profit|stichting|ngo|charity|vereniging/i],
  },
  {
    cls: "professional_services",
    patterns: [/consultancy|advocaat|notaris|agency|bureau|accounting/i],
  },
  {
    cls: "real_estate",
    patterns: [/real estate|vastgoed|makelaar|property/i],
  },
  {
    cls: "agriculture",
    patterns: [/agricultur|boer|farm|agri|tuinbouw/i],
  },
  {
    cls: "energy",
    patterns: [/energy|energie|solar|wind|utilities/i],
  },
  {
    cls: "media",
    patterns: [/media|publisher|broadcast|content studio|marketing agency/i],
  },
];

export function classifyBusiness(text: string): {
  businessClass: BusinessClass;
  confidence: number;
  matched: string[];
} {
  const hay = text.trim();
  if (!hay) {
    return { businessClass: "other", confidence: 0.2, matched: [] };
  }

  const matched: string[] = [];
  let best: BusinessClass = "other";
  let bestHits = 0;

  for (const rule of RULES) {
    let hits = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(hay)) hits += 1;
    }
    if (hits > bestHits) {
      bestHits = hits;
      best = rule.cls;
      matched.length = 0;
      matched.push(rule.cls);
    }
  }

  const confidence =
    bestHits === 0 ? 0.25 : Math.min(0.95, 0.45 + bestHits * 0.2);

  if (!BUSINESS_CLASSES.includes(best)) {
    return { businessClass: "other", confidence: 0.25, matched: [] };
  }

  return { businessClass: best, confidence, matched };
}
