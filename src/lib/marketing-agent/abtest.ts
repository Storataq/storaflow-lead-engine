/**
 * A/B test engine — variants + winner selection.
 */

import type { AbTestType } from "@/lib/marketing-agent/constants";
import type { AbTestResult, AbVariant } from "@/lib/marketing-agent/types";

function rate(v: AbVariant): number {
  if (v.impressions <= 0) return 0;
  return v.conversions / v.impressions;
}

export function buildAbVariants(params: {
  testType: AbTestType;
  baseValue: string;
}): AbVariant[] {
  const base = params.baseValue.trim() || "Variant";
  const alts: Record<AbTestType, [string, string]> = {
    subject: [`${base} — snelle tip`, `Vraag: ${base}?`],
    cta: [`${base} nu`, `Ontdek ${base}`],
    image: [`${base} hero A`, `${base} hero B`],
    copy: [`Korte copy: ${base}`, `Lange copy: ${base}`],
    button: [`Start ${base}`, `Probeer ${base}`],
    color: [`Primary / ${base}`, `Accent / ${base}`],
    landing: [`Landing A: ${base}`, `Landing B: ${base}`],
    timing: [`Ochtend (09:00)`, `Middag (14:00)`],
  };
  const [a, b] = alts[params.testType];
  return [
    { id: "A", label: "Variant A", value: a, impressions: 0, conversions: 0 },
    { id: "B", label: "Variant B", value: b, impressions: 0, conversions: 0 },
  ];
}

export function evaluateAbTest(variants: AbVariant[]): AbTestResult {
  if (variants.length === 0) {
    return { winnerVariantId: null, confidence: 0, variants: [] };
  }

  const ranked = [...variants].sort((a, b) => rate(b) - rate(a));
  const best = ranked[0]!;
  const second = ranked[1];
  const bestRate = rate(best);
  const secondRate = second ? rate(second) : 0;
  const volume = variants.reduce((s, v) => s + v.impressions, 0);

  let confidence = 0.2;
  if (volume >= 200 && bestRate > secondRate) {
    confidence = Math.min(
      0.98,
      0.45 + (bestRate - secondRate) * 2 + Math.min(0.3, volume / 2000),
    );
  } else if (volume >= 50) {
    confidence = 0.35 + Math.min(0.25, bestRate);
  }

  const winnerVariantId =
    volume >= 50 && bestRate > 0 && confidence >= 0.55 ? best.id : null;

  return {
    winnerVariantId,
    confidence: Math.round(confidence * 100) / 100,
    variants: ranked,
  };
}

export function applySampleResults(
  variants: AbVariant[],
  samples?: Array<{ id: string; impressions: number; conversions: number }>,
): AbVariant[] {
  if (!samples?.length) {
    // Deterministic pseudo-results for offline evaluation when no live metrics yet
    return variants.map((v, i) => ({
      ...v,
      impressions: 120 + i * 20,
      conversions: 8 + (variants.length - i) * 3,
    }));
  }
  const map = new Map(samples.map((s) => [s.id, s]));
  return variants.map((v) => {
    const s = map.get(v.id);
    return s
      ? { ...v, impressions: s.impressions, conversions: s.conversions }
      : v;
  });
}
