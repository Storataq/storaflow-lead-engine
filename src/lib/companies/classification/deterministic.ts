import {
  CATEGORY_KEYWORD_LEXICON,
  confidenceBandFromScore,
} from "@/lib/companies/classification/constants";
import type {
  ClassificationAlternative,
  ClassificationResult,
  ClassificationSignals,
} from "@/lib/companies/classification/types";
import type { CompanyCategoryRow } from "@/lib/companies/categories/types";

function buildCorpus(signals: ClassificationSignals): string {
  const parts = [
    signals.companyName,
    signals.websiteUrl,
    signals.industry,
    signals.description,
    signals.notes,
    signals.city,
    signals.country,
    signals.websiteTitle,
    signals.metaDescription,
    signals.aboutText,
    signals.homepageText,
    signals.linkedinIndustry,
    ...(signals.keywords ?? []),
    ...(signals.googleCategories ?? []),
    ...(signals.products ?? []),
    ...(signals.services ?? []),
    ...(signals.technologies ?? []),
  ];
  return parts
    .filter((v): v is string => Boolean(v && String(v).trim()))
    .join("\n")
    .toLowerCase();
}

function truncate(text: string, max = 4000): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function classifyDeterministic(input: {
  signals: ClassificationSignals;
  categories: CompanyCategoryRow[];
}): ClassificationResult {
  const active = input.categories.filter((c) => c.is_active);
  const corpus = buildCorpus(input.signals);
  const scored: Array<{
    category: CompanyCategoryRow;
    score: number;
    keywords: string[];
  }> = [];

  for (const category of active) {
    const lexicon =
      CATEGORY_KEYWORD_LEXICON[category.slug] ??
      CATEGORY_KEYWORD_LEXICON[category.name.toLowerCase().replace(/\s+/g, "-")] ??
      [category.name.toLowerCase(), category.slug.replace(/-/g, " ")];

    const keywords: string[] = [];
    let hits = 0;
    for (const keyword of lexicon) {
      if (!keyword) continue;
      if (corpus.includes(keyword.toLowerCase())) {
        hits += 1;
        keywords.push(keyword);
      }
    }

    // Name/slug exact-ish boost
    if (corpus.includes(category.name.toLowerCase())) {
      hits += 2;
      keywords.push(category.name);
    }

    if (hits === 0) continue;
    // Soft saturate: 1 hit ~55, 2 ~72, 3 ~85, 4+ ~94-98
    const score = Math.min(98, Math.round(40 + hits * 14 + (hits > 3 ? 8 : 0)));
    scored.push({ category, score, keywords: Array.from(new Set(keywords)) });
  }

  scored.sort((a, b) => b.score - a.score || a.category.name.localeCompare(b.category.name));

  if (scored.length === 0) {
    return {
      suggestedCategoryId: null,
      suggestedCategoryName: null,
      suggestedCategorySlug: null,
      confidence: 0,
      confidenceBand: "unknown",
      reason: "Not enough signal to classify. Manual review required.",
      keywordsFound: [],
      alternatives: [],
      classifiedBy: "automatic",
      provider: null,
      model: null,
      inputSummary: {
        fieldsUsed: Object.keys(input.signals).filter(
          (k) => (input.signals as Record<string, unknown>)[k],
        ),
        corpusPreview: truncate(corpus, 280),
      },
    };
  }

  const top = scored[0];
  const alternatives: ClassificationAlternative[] = scored.slice(0, 3).map((row) => ({
    categoryId: row.category.id,
    name: row.category.name,
    slug: row.category.slug,
    confidence: row.score,
  }));

  const band = confidenceBandFromScore(top.score);
  const reason =
    band === "unknown"
      ? "Signals were weak. Manual review required."
      : `Detected signals matching “${top.category.name}”: ${top.keywords.slice(0, 8).join(", ")}.`;

  return {
    suggestedCategoryId: top.category.id,
    suggestedCategoryName: top.category.name,
    suggestedCategorySlug: top.category.slug,
    confidence: top.score,
    confidenceBand: band,
    reason,
    keywordsFound: top.keywords.slice(0, 20),
    alternatives,
    classifiedBy: "automatic",
    provider: null,
    model: "deterministic-lexicon",
    inputSummary: {
      fieldsUsed: Object.keys(input.signals).filter(
        (k) => (input.signals as Record<string, unknown>)[k],
      ),
      corpusPreview: truncate(corpus, 280),
      candidates: alternatives,
    },
  };
}
