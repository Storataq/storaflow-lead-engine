/**
 * Landing page analysis engine.
 */

import type { LandingAnalysisResult } from "@/lib/marketing-agent/types";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function analyzeLandingPage(params: {
  url: string;
  htmlOrText?: string | null;
  titleHint?: string | null;
}): LandingAnalysisResult {
  const text = (params.htmlOrText ?? "").toLowerCase();
  const url = params.url.trim();
  const title =
    params.titleHint?.trim() ||
    url.replace(/^https?:\/\//i, "").split("/")[0] ||
    "Landing page";

  const hasCta =
    /aanmelden|demo|probeer|start|koop|registreer|cta|button|inschrijven/.test(
      text,
    ) || text.length === 0;
  const hasH1 = /<h1|heading|titel/.test(text) || text.length < 40;
  const hasMeta = /meta description|og:title|seo/.test(text) || text.length < 40;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const readable =
    wordCount === 0
      ? 55
      : wordCount < 80
        ? 40
        : wordCount < 400
          ? 75
          : wordCount < 900
            ? 70
            : 50;

  const conversionScore = clamp(
    35 + (hasCta ? 30 : 0) + (hasH1 ? 10 : 0) + (url.includes("https") ? 5 : 0),
  );
  const readabilityScore = clamp(readable);
  const seoScore = clamp(30 + (hasMeta ? 25 : 0) + (hasH1 ? 15 : 0) + (url.length < 80 ? 10 : 0));
  const structureScore = clamp(40 + (hasH1 ? 20 : 0) + (hasCta ? 15 : 0));
  const contentQualityScore = clamp(
    35 + Math.min(40, Math.floor(wordCount / 20)) + (hasCta ? 10 : 0),
  );
  const overallScore = clamp(
    (conversionScore +
      readabilityScore +
      seoScore +
      structureScore +
      contentQualityScore) /
      5,
  );

  const improvements: string[] = [];
  if (!hasCta) improvements.push("Voeg een primaire CTA above the fold toe");
  if (!hasH1) improvements.push("Gebruik één duidelijke H1 met zoekintentie");
  if (!hasMeta) improvements.push("Verbeter meta title/description voor SEO");
  if (wordCount > 0 && wordCount < 80) {
    improvements.push("Breid content uit met social proof en benefits");
  }
  if (wordCount > 900) {
    improvements.push("Verkort copy en splits in scannable secties");
  }
  if (overallScore < 70) {
    improvements.push("Test een kortere hero + sterkere value proposition");
  }
  if (improvements.length === 0) {
    improvements.push("Run A/B test op CTA-tekst en hero headline");
  }

  return {
    title,
    conversionScore,
    readabilityScore,
    seoScore,
    structureScore,
    contentQualityScore,
    overallScore,
    improvements,
    analysis: {
      url,
      wordCount,
      hasCta,
      hasH1,
      hasMeta,
      speedNote: "Snelheid: meet Core Web Vitals in productie; cache assets.",
    },
  };
}
