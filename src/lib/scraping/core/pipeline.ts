/**
 * Discovery pipeline placeholders.
 *
 * Connector → Parser → Normalizer → Validator → Dedup → AI classify → Persist
 * Only stubs in this phase — no network, no AI, no persistence side effects.
 */

import type { ConnectorResult } from "@/lib/scraping/types/connector";

export type PipelineContext = {
  organizationId: string;
  jobId?: string;
  sourceCode: string;
};

export async function parseResults(
  items: ConnectorResult[],
): Promise<ConnectorResult[]> {
  // Placeholder: live connectors will parse HTML/JSON here.
  return items;
}

export async function normalizeResults(
  items: ConnectorResult[],
): Promise<ConnectorResult[]> {
  return items.map((item) => ({
    ...item,
    companyName: item.companyName.trim(),
    website: item.website?.trim() || null,
    email: item.email?.trim().toLowerCase() || null,
    country: item.country?.toUpperCase() || item.country || null,
  }));
}

export async function validateResults(
  items: ConnectorResult[],
): Promise<ConnectorResult[]> {
  return items.filter((item) => item.companyName.length > 0 && item.sourceUrl);
}

export async function deduplicateResults(
  items: ConnectorResult[],
): Promise<ConnectorResult[]> {
  const seen = new Set<string>();
  const out: ConnectorResult[] = [];
  for (const item of items) {
    const key = `${item.companyName.toLowerCase()}|${item.website ?? ""}|${item.city ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Placeholder for future AI classification / ranking. */
export async function classifyResults(
  items: ConnectorResult[],
): Promise<ConnectorResult[]> {
  return items;
}

/** Placeholder — persistence happens in job actions today. */
export async function persistResults(
  _context: PipelineContext,
  items: ConnectorResult[],
): Promise<ConnectorResult[]> {
  return items;
}

/**
 * Runs the stub pipeline end-to-end on connector output.
 */
export async function runDiscoveryPipeline(
  context: PipelineContext,
  items: ConnectorResult[],
): Promise<ConnectorResult[]> {
  const parsed = await parseResults(items);
  const normalized = await normalizeResults(parsed);
  const validated = await validateResults(normalized);
  const deduped = await deduplicateResults(validated);
  const classified = await classifyResults(deduped);
  return persistResults(context, classified);
}
