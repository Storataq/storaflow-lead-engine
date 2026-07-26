/**
 * Server actions for connector mock tests.
 */

"use server";

import "@/lib/scraping/connectors/bootstrap";

import { ConnectorError } from "@/lib/scraping/connectors/errors";
import type { ConnectorLogEntry } from "@/lib/scraping/connectors/logger";
import { runMockPipelineTest } from "@/lib/scraping/connectors/mock-test-service";
import type { NormalizedBusinessResult } from "@/lib/scraping/connectors/types";
import { ConnectorLogBuffer } from "@/lib/scraping/core/logging";
import { runDiscoveryPipeline } from "@/lib/scraping/core/pipeline";
import { getRegisteredConnector } from "@/lib/scraping/registry";
import type {
  ConnectorLogEntry as LegacyConnectorLogEntry,
  ConnectorResult,
} from "@/lib/scraping/types/connector";

export type ConnectorMockTestResult = {
  success: boolean;
  message: string;
  connectorCode?: string;
  runtimeMs?: number;
  fetchedCount?: number;
  validCount?: number;
  invalidCount?: number;
  duplicatesRemoved?: number;
  results?: NormalizedBusinessResult[];
  /** Foundation pipeline logs */
  logs?: ConnectorLogEntry[];
  /** Legacy job-adapter mock logs (fallback connectors) */
  legacyLogs?: LegacyConnectorLogEntry[];
  /** Legacy results for older UI paths */
  legacyResults?: ConnectorResult[];
};

function mapLegacyToNormalized(
  connectorCode: string,
  items: ConnectorResult[],
): NormalizedBusinessResult[] {
  return items.map((item, index) => ({
    source: connectorCode,
    sourceId: `${connectorCode}:${index + 1}`,
    name: item.companyName,
    website: item.website ?? null,
    emails: item.email ? [item.email] : [],
    phones: item.phone ? [item.phone] : [],
    street: item.address ?? null,
    postalCode: item.postalCode ?? null,
    city: item.city ?? null,
    region: item.region ?? null,
    countryCode: item.country ?? null,
    industry: item.category ?? null,
    categories: item.category ? [item.category] : [],
    description: null,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    confidence:
      typeof item.score === "number"
        ? Math.min(1, Math.max(0, item.score / 100))
        : 0.5,
    rawData: item.raw ?? {},
  }));
}

/**
 * Runs a local mock pipeline test — no network, no browser.
 * Prefers the foundation ConnectorFactory path; falls back to the
 * modular registry for connectors not yet on the foundation registry.
 */
export async function runConnectorMockTestAction(
  connectorCode: string,
): Promise<ConnectorMockTestResult> {
  const foundation = await runMockPipelineTest(connectorCode);
  if (foundation.success && foundation.summary) {
    const summary = foundation.summary;
    return {
      success: true,
      message: foundation.message,
      connectorCode: summary.connectorCode,
      runtimeMs: summary.runtimeMs,
      fetchedCount: summary.fetchedCount,
      validCount: summary.validCount,
      invalidCount: summary.invalidCount,
      duplicatesRemoved: summary.duplicatesRemoved,
      results: summary.results,
      logs: summary.logs,
    };
  }

  // Foundation registry currently only has "mock". Other catalog connectors
  // keep the previous modular mock path so the UI does not break.
  if (foundation.summary?.logs.some((log) => log.level === "error")) {
    const isNotFound =
      foundation.message.includes("is not registered") ||
      foundation.message.includes("CONNECTOR_NOT_FOUND");

    if (!isNotFound) {
      return {
        success: false,
        message: foundation.message,
        connectorCode,
        runtimeMs: foundation.summary.runtimeMs,
        fetchedCount: 0,
        validCount: 0,
        invalidCount: 0,
        duplicatesRemoved: 0,
        results: [],
        logs: foundation.summary.logs,
      };
    }
  }

  const started = Date.now();
  const logs = new ConnectorLogBuffer();

  try {
    const connector = getRegisteredConnector(connectorCode);
    if (!connector) {
      return {
        success: false,
        message:
          foundation.message ||
          `Connector "${connectorCode}" is not registered`,
        connectorCode,
        runtimeMs: Date.now() - started,
        logs: foundation.summary?.logs,
      };
    }

    logs.log(connectorCode, "loaded", `Loaded ${connector.manifest.name}`);
    logs.log(connectorCode, "started", "Legacy mock test started");

    const page = await connector.searchPage({
      organizationId: "mock-org",
      jobId: `mock-test-${connectorCode}`,
      keywords: ["Florist", "Bloemist"],
      countries: ["NL", "DE", "BE"],
      cities: ["Amsterdam", "Berlin", "Antwerp"],
      regions: ["North Holland"],
      languages: ["nl", "en"],
      industries: ["retail"],
      searchPrompt: "Find florists with a website",
      pageIndex: 0,
      pageSize: 10,
    });

    const pipelineResults = await runDiscoveryPipeline(
      {
        organizationId: "mock-org",
        jobId: `mock-test-${connectorCode}`,
        sourceCode: connectorCode,
      },
      page.items,
    );

    logs.log(
      connectorCode,
      "finished",
      `Finished — ${pipelineResults.length} companies`,
    );

    const normalized = mapLegacyToNormalized(connectorCode, pipelineResults);

    return {
      success: true,
      message: `${connector.manifest.name}: ${pipelineResults.length} mock bedrijven`,
      connectorCode,
      runtimeMs: Date.now() - started,
      fetchedCount: page.items.length,
      validCount: pipelineResults.length,
      invalidCount: 0,
      duplicatesRemoved: Math.max(0, page.items.length - pipelineResults.length),
      results: normalized,
      legacyLogs: logs.all(),
      legacyResults: pipelineResults,
    };
  } catch (error) {
    const message =
      error instanceof ConnectorError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Mock test failed";

    logs.log(connectorCode, "failed", message);

    return {
      success: false,
      message,
      connectorCode,
      runtimeMs: Date.now() - started,
      legacyLogs: logs.all(),
    };
  }
}
