/**
 * AI enrichment placeholder — no external AI calls.
 */

import type { ConnectorLogger } from "@/lib/scraping/connectors/logger";
import type { NormalizedBusinessResult } from "@/lib/scraping/connectors/types";

export type AiEnrichmentOptions = {
  connectorCode: string;
  logger?: ConnectorLogger;
};

/**
 * Pass-through placeholder for future AI enrichment / classification.
 */
export function enrichWithAiPlaceholder(
  items: NormalizedBusinessResult[],
  options: AiEnrichmentOptions,
): NormalizedBusinessResult[] {
  options.logger?.info(
    options.connectorCode,
    "AI enrichment placeholder skipped (no external calls)",
    { count: items.length },
  );

  return items.map((item) => ({
    ...item,
    rawData: {
      ...item.rawData,
      aiEnrichment: "placeholder",
    },
  }));
}
