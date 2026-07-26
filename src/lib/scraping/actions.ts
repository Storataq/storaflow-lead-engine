"use server";

import { ConnectorLogBuffer } from "@/lib/scraping/core/logging";
import { runDiscoveryPipeline } from "@/lib/scraping/core/pipeline";
import { getRegisteredConnectorOrThrow } from "@/lib/scraping/registry";
import type {
  ConnectorLogEntry,
  ConnectorResult,
} from "@/lib/scraping/types/connector";

export type ConnectorMockTestResult = {
  success: boolean;
  message: string;
  connectorCode?: string;
  runtimeMs?: number;
  results?: ConnectorResult[];
  logs?: ConnectorLogEntry[];
};

/**
 * Runs a local mock test for a connector — 10 synthetic companies, no network.
 */
export async function runConnectorMockTestAction(
  connectorCode: string,
): Promise<ConnectorMockTestResult> {
  const started = Date.now();
  const logs = new ConnectorLogBuffer();

  try {
    const connector = getRegisteredConnectorOrThrow(connectorCode);
    logs.log(connectorCode, "loaded", `Loaded ${connector.manifest.name}`);
    logs.log(connectorCode, "started", "Mock test started");

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

    logs.log(connectorCode, "progress", `Progress ${page.progress?.percent ?? 20}%`, {
      count: page.items.length,
    });

    const pipelineResults = await runDiscoveryPipeline(
      {
        organizationId: "mock-org",
        jobId: `mock-test-${connectorCode}`,
        sourceCode: connectorCode,
      },
      page.items,
    );

    logs.log(connectorCode, "finished", `Finished — ${pipelineResults.length} companies`);

    return {
      success: true,
      message: `${connector.manifest.name}: ${pipelineResults.length} mock bedrijven`,
      connectorCode,
      runtimeMs: Date.now() - started,
      results: pipelineResults,
      logs: logs.all(),
    };
  } catch (error) {
    logs.log(
      connectorCode,
      "failed",
      error instanceof Error ? error.message : "Mock test failed",
    );
    return {
      success: false,
      message: error instanceof Error ? error.message : "Mock test failed",
      connectorCode,
      runtimeMs: Date.now() - started,
      logs: logs.all(),
    };
  }
}
