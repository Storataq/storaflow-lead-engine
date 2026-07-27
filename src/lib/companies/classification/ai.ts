import { createAIProvider } from "@/lib/email/ai/provider";
import { getDefaultAiModel } from "@/lib/email/ai/constants";
import {
  confidenceBandFromScore,
} from "@/lib/companies/classification/constants";
import type {
  ClassificationAlternative,
  ClassificationResult,
  ClassificationSignals,
} from "@/lib/companies/classification/types";
import type { CompanyCategoryRow } from "@/lib/companies/categories/types";

type AiPayload = {
  suggestedSlug?: string;
  confidence?: number;
  reason?: string;
  keywords?: string[];
  alternatives?: Array<{ slug: string; confidence: number }>;
};

function signalsToUserPrompt(
  signals: ClassificationSignals,
  categories: CompanyCategoryRow[],
): string {
  const catalog = categories
    .filter((c) => c.is_active)
    .map((c) => `- ${c.slug}: ${c.name}`)
    .join("\n");

  return JSON.stringify(
    {
      task: "Pick the best company category slug from the catalog.",
      catalog,
      company: {
        name: signals.companyName,
        website: signals.websiteUrl,
        industry: signals.industry,
        description: signals.description,
        notes: signals.notes,
        location: [signals.city, signals.country].filter(Boolean).join(", "),
        websiteTitle: signals.websiteTitle,
        metaDescription: signals.metaDescription,
        aboutText: signals.aboutText?.slice(0, 2500),
        homepageText: signals.homepageText?.slice(0, 2500),
        keywords: signals.keywords,
        googleCategories: signals.googleCategories,
        linkedinIndustry: signals.linkedinIndustry,
        products: signals.products,
        services: signals.services,
        technologies: signals.technologies,
      },
      outputSchema: {
        suggestedSlug: "string from catalog",
        confidence: "0-100 number",
        reason: "short explanation",
        keywords: ["detected keywords"],
        alternatives: [{ slug: "string", confidence: 0 }],
      },
    },
    null,
    2,
  );
}

export async function classifyWithOptionalAI(input: {
  signals: ClassificationSignals;
  categories: CompanyCategoryRow[];
  deterministic: ClassificationResult;
}): Promise<ClassificationResult> {
  const provider = createAIProvider();
  if (!provider.isConfigured()) {
    return input.deterministic;
  }

  // Prefer AI only when deterministic is uncertain or borderline.
  if (
    input.deterministic.confidenceBand === "auto_select" &&
    input.deterministic.confidence >= 97
  ) {
    return input.deterministic;
  }

  try {
    const model = getDefaultAiModel();
    const response = await provider.complete({
      model,
      system:
        "You classify companies into exactly one category from the provided catalog. Return JSON only. Never invent slugs. If unsure, pick best effort with low confidence.",
      user: signalsToUserPrompt(input.signals, input.categories),
      responseFormat: "json",
      maxOutputTokens: 600,
      timeoutMs: 25000,
    });

    const parsed = JSON.parse(response.content) as AiPayload;
    const bySlug = new Map(
      input.categories.map((c) => [c.slug.toLowerCase(), c]),
    );
    const suggested =
      (parsed.suggestedSlug
        ? bySlug.get(parsed.suggestedSlug.toLowerCase())
        : null) ?? null;

    if (!suggested) {
      return {
        ...input.deterministic,
        classifiedBy: "hybrid",
        provider: provider.code,
        model: response.model,
        reason: `${input.deterministic.reason} AI returned an unknown slug; kept heuristic result.`,
      };
    }

    const confidence = Math.max(
      0,
      Math.min(100, Number(parsed.confidence ?? input.deterministic.confidence)),
    );
    const alternatives: ClassificationAlternative[] = (parsed.alternatives ?? [])
      .map((alt) => {
        const cat = bySlug.get(String(alt.slug ?? "").toLowerCase());
        if (!cat) return null;
        return {
          categoryId: cat.id,
          name: cat.name,
          slug: cat.slug,
          confidence: Math.max(0, Math.min(100, Number(alt.confidence ?? 0))),
        };
      })
      .filter((v): v is ClassificationAlternative => Boolean(v))
      .slice(0, 3);

    if (alternatives.length === 0) {
      alternatives.push({
        categoryId: suggested.id,
        name: suggested.name,
        slug: suggested.slug,
        confidence,
      });
    }

    return {
      suggestedCategoryId: suggested.id,
      suggestedCategoryName: suggested.name,
      suggestedCategorySlug: suggested.slug,
      confidence,
      confidenceBand: confidenceBandFromScore(confidence),
      reason:
        parsed.reason?.trim() ||
        `AI suggested “${suggested.name}” based on available company signals.`,
      keywordsFound: Array.isArray(parsed.keywords)
        ? parsed.keywords.map(String).slice(0, 20)
        : input.deterministic.keywordsFound,
      alternatives,
      classifiedBy: "hybrid",
      provider: provider.code,
      model: response.model,
      inputSummary: {
        ...input.deterministic.inputSummary,
        aiUsed: true,
      },
    };
  } catch {
    return {
      ...input.deterministic,
      classifiedBy: "automatic",
      reason: `${input.deterministic.reason} (AI unavailable; heuristic used.)`,
    };
  }
}
