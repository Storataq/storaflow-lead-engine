/**
 * Central job execution service for foundation connectors (Mock / Google Maps MVP).
 *
 * Flow: load job → activate → ConnectorFactory → pipeline → persist → complete/fail
 * Progress only increases. No external network.
 */

import "@/lib/scraping/connectors/bootstrap";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_CONNECTOR_CODE,
  MOCK_ENGINE_CLAIM,
  PIPELINE_PROGRESS,
  PIPELINE_STAGE_COUNT,
  computeRuntimeMs,
  normalizeJobStatus,
} from "@/lib/jobs/constants";
import { persistPipelineResults } from "@/lib/jobs/execution/persist-results";
import { appendJobLog } from "@/lib/jobs/logging";
import {
  complete as queueComplete,
  enqueue,
  fail as queueFail,
} from "@/lib/jobs/queue-service";
import type { ScrapeJobRow } from "@/lib/jobs/queries";
import { resolveJobConnectorCode } from "@/lib/jobs/resolve-connector-code";
import { ConnectorError } from "@/lib/scraping/connectors/errors";
import {
  ConnectorFactory,
  defaultConnectorFactory,
} from "@/lib/scraping/connectors/factory";
import { GOOGLE_MAPS_CONNECTOR_CODE } from "@/lib/scraping/connectors/google-maps";
import { validateGoogleMapsResults } from "@/lib/scraping/connectors/google-maps/validator";
import { InMemoryConnectorLogger } from "@/lib/scraping/connectors/logger";
import { enrichWithAiPlaceholder } from "@/lib/scraping/connectors/pipeline/ai-enrichment";
import { deduplicateBusinessResults } from "@/lib/scraping/connectors/pipeline/deduplicator";
import { normalizeBusinessResults } from "@/lib/scraping/connectors/pipeline/normalizer";
import { parseSearchResults } from "@/lib/scraping/connectors/pipeline/parser";
import { validateBusinessResults } from "@/lib/scraping/connectors/pipeline/validator";
import type { ConnectorSearchInput } from "@/lib/scraping/connectors/types";
import type { SearchQueryRow } from "@/lib/searches/queries";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export type MockJobExecutionResult = {
  success: boolean;
  message: string;
  jobId: string;
  status?: string;
  done: boolean;
};

function safeErrorMessage(error: unknown): string {
  if (error instanceof ConnectorError) {
    return error.message;
  }
  if (error instanceof Error) {
    const firstLine = error.message.split("\n")[0]?.trim() ?? "Onbekende fout";
    return firstLine.slice(0, 240);
  }
  return "Onbekende fout tijdens scrape.";
}

async function bumpProgress(
  supabase: Client,
  organizationId: string,
  jobId: string,
  currentPercent: number,
  nextPercent: number,
  patch?: Database["public"]["Tables"]["scrape_jobs"]["Update"],
): Promise<number> {
  const progress = Math.max(currentPercent, nextPercent);
  await supabase
    .from("scrape_jobs")
    .update({
      progress_percent: progress,
      last_heartbeat_at: new Date().toISOString(),
      ...patch,
    })
    .eq("organization_id", organizationId)
    .eq("id", jobId);
  return progress;
}

function buildSearchInput(searchQuery: SearchQueryRow): ConnectorSearchInput {
  const keywords = searchQuery.keywords?.length
    ? searchQuery.keywords
    : searchQuery.keyword
      ? [searchQuery.keyword]
      : ["local businesses"];

  return {
    query: keywords.join(" ") || "local businesses",
    countries: searchQuery.countries?.length
      ? searchQuery.countries
      : searchQuery.country
        ? [searchQuery.country]
        : ["NL"],
    cities: searchQuery.cities?.length
      ? searchQuery.cities
      : searchQuery.city
        ? [searchQuery.city]
        : undefined,
    regions: searchQuery.regions?.length
      ? searchQuery.regions
      : searchQuery.region
        ? [searchQuery.region]
        : undefined,
    languages: searchQuery.languages ?? undefined,
    limit: 20,
  };
}

function resolveSourceCode(
  job: ScrapeJobRow,
  searchQuery: SearchQueryRow,
): string {
  if (job.current_source_code) {
    if (defaultConnectorFactory.tryCreate(job.current_source_code)) {
      return job.current_source_code;
    }
  }
  return resolveJobConnectorCode(searchQuery.sources ?? []);
}

export type MockJobExecutorOptions = {
  factory?: ConnectorFactory;
};

/**
 * Advances one lifecycle step, or runs the full pipeline when active.
 */
export class MockJobExecutor {
  private readonly factory: ConnectorFactory;

  constructor(options: MockJobExecutorOptions = {}) {
    this.factory = options.factory ?? defaultConnectorFactory;
  }

  async advance(
    supabase: Client,
    organizationId: string,
    job: ScrapeJobRow,
    searchQuery: SearchQueryRow | null,
  ): Promise<MockJobExecutionResult> {
    const status = normalizeJobStatus(job.status);

    if (
      status === "completed" ||
      status === "failed" ||
      status === "cancelled" ||
      status === "paused"
    ) {
      return {
        success: true,
        message: "Taak is niet actief.",
        jobId: job.id,
        status,
        done: true,
      };
    }

    if (status === "draft" || status === "pending") {
      const queued = await enqueue(supabase, organizationId, job.id);
      if (queued.success && queued.job) {
        await bumpProgress(
          supabase,
          organizationId,
          job.id,
          queued.job.progress_percent,
          PIPELINE_PROGRESS.queued,
        );
      }
      return {
        success: queued.success,
        message: queued.message,
        jobId: job.id,
        status: "queued",
        done: false,
      };
    }

    if (status === "queued") {
      return this.activate(supabase, organizationId, job);
    }

    if (!searchQuery) {
      await queueFail(
        supabase,
        organizationId,
        job.id,
        "Geen gekoppelde zoekopdracht.",
      );
      return {
        success: false,
        message: "Geen gekoppelde zoekopdracht.",
        jobId: job.id,
        status: "failed",
        done: true,
      };
    }

    return this.executePipeline(supabase, organizationId, job, searchQuery);
  }

  private async activate(
    supabase: Client,
    organizationId: string,
    job: ScrapeJobRow,
  ): Promise<MockJobExecutionResult> {
    const now = new Date().toISOString();
    const { data: activated, error } = await supabase
      .from("scrape_jobs")
      .update({
        status: "active",
        started_at: job.started_at ?? now,
        claimed_at: now,
        claimed_by: MOCK_ENGINE_CLAIM,
        last_heartbeat_at: now,
        pages_processed: 0,
        progress_percent: Math.max(
          job.progress_percent,
          PIPELINE_PROGRESS.queued,
        ),
        pages_total: PIPELINE_STAGE_COUNT,
        target_pages: PIPELINE_STAGE_COUNT,
        current_source_code:
          job.current_source_code ?? DEFAULT_CONNECTOR_CODE,
      })
      .eq("id", job.id)
      .eq("organization_id", organizationId)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();

    if (error) {
      return {
        success: false,
        message: error.message,
        jobId: job.id,
        done: false,
      };
    }

    if (!activated) {
      return {
        success: true,
        message: "Job is al geclaimd of niet meer queued.",
        jobId: job.id,
        status: "active",
        done: false,
      };
    }

    await appendJobLog(supabase, {
      organizationId,
      jobId: job.id,
      eventCode: "job_started",
      message: "Job started",
      sourceCode: activated.current_source_code,
      metadata: { claimed_by: MOCK_ENGINE_CLAIM },
    });

    return {
      success: true,
      message: "Active",
      jobId: job.id,
      status: "active",
      done: false,
    };
  }

  private async executePipeline(
    supabase: Client,
    organizationId: string,
    job: ScrapeJobRow,
    searchQuery: SearchQueryRow,
  ): Promise<MockJobExecutionResult> {
    const sourceCode = resolveSourceCode(job, searchQuery);
    const now = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabase
      .from("scrape_jobs")
      .update({
        pages_processed: 1,
        progress_percent: Math.max(
          job.progress_percent,
          PIPELINE_PROGRESS.connectorInitialized,
        ),
        last_heartbeat_at: now,
        current_source_code: sourceCode,
      })
      .eq("id", job.id)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .eq("pages_processed", 0)
      .select("*")
      .maybeSingle();

    if (claimError) {
      return {
        success: false,
        message: claimError.message,
        jobId: job.id,
        status: "active",
        done: false,
      };
    }

    if (!claimed) {
      const { data: latest } = await supabase
        .from("scrape_jobs")
        .select("status, progress_percent")
        .eq("id", job.id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      const terminal =
        latest &&
        ["completed", "failed", "cancelled", "paused"].includes(
          normalizeJobStatus(latest.status),
        );

      return {
        success: true,
        message: terminal
          ? "Taak is niet actief."
          : "Pipeline wordt al uitgevoerd…",
        jobId: job.id,
        status: latest?.status ?? "active",
        done: Boolean(terminal),
      };
    }

    let progress = Math.max(
      claimed.progress_percent,
      PIPELINE_PROGRESS.connectorInitialized,
    );

    try {
      await appendJobLog(supabase, {
        organizationId,
        jobId: job.id,
        eventCode: "initializing",
        message: "Initializing",
        sourceCode,
        metadata: { progress_percent: progress },
      });

      const connector = this.factory.create(sourceCode);
      const logger = new InMemoryConnectorLogger();
      const input = buildSearchInput(searchQuery);

      await connector.connect();

      try {
        const valid = await connector.validate(input);
        if (!valid) {
          throw new ConnectorError("Invalid connector search input", {
            code: "CONNECTOR_VALIDATION_ERROR",
            connectorCode: connector.code,
          });
        }

        await appendJobLog(supabase, {
          organizationId,
          jobId: job.id,
          eventCode: "search_started",
          message: "Search started",
          sourceCode: connector.code,
          metadata: {
            query: input.query,
            countries: input.countries ?? [],
            cities: input.cities ?? [],
          },
        });

        const searched = await connector.search(input);
        progress = await bumpProgress(
          supabase,
          organizationId,
          job.id,
          progress,
          PIPELINE_PROGRESS.searchCompleted,
          { pages_processed: 2 },
        );
        await appendJobLog(supabase, {
          organizationId,
          jobId: job.id,
          eventCode: "results_received",
          message: "Results received",
          sourceCode: connector.code,
          metadata: {
            progress_percent: progress,
            fetched: searched.total,
          },
        });

        progress = await bumpProgress(
          supabase,
          organizationId,
          job.id,
          progress,
          PIPELINE_PROGRESS.parsing,
          { pages_processed: 3 },
        );
        const parsed = parseSearchResults(searched.results);
        await appendJobLog(supabase, {
          organizationId,
          jobId: job.id,
          eventCode: "parsing_complete",
          message: "Parsing complete",
          sourceCode: connector.code,
          metadata: { count: parsed.length, progress_percent: progress },
        });

        const normalized = normalizeBusinessResults(parsed);
        progress = await bumpProgress(
          supabase,
          organizationId,
          job.id,
          progress,
          PIPELINE_PROGRESS.normalized,
          { pages_processed: 4 },
        );
        await appendJobLog(supabase, {
          organizationId,
          jobId: job.id,
          eventCode: "normalization_complete",
          message: "Normalization complete",
          sourceCode: connector.code,
          metadata: {
            progress_percent: progress,
            count: normalized.length,
          },
        });

        const validation =
          connector.code === GOOGLE_MAPS_CONNECTOR_CODE
            ? validateGoogleMapsResults(normalized)
            : validateBusinessResults(normalized);

        for (const issue of validation.issues) {
          await appendJobLog(supabase, {
            organizationId,
            jobId: job.id,
            eventCode: "validation_issue",
            message: issue.message,
            level: "warn",
            sourceCode: connector.code,
            metadata: {
              sourceId: issue.sourceId,
              field: issue.field,
            },
          });
        }

        progress = await bumpProgress(
          supabase,
          organizationId,
          job.id,
          progress,
          PIPELINE_PROGRESS.validated,
          {
            pages_processed: 5,
            error_count: (job.error_count ?? 0) + validation.invalid.length,
          },
        );
        await appendJobLog(supabase, {
          organizationId,
          jobId: job.id,
          eventCode: "validation_complete",
          message: "Validation complete",
          sourceCode: connector.code,
          metadata: {
            progress_percent: progress,
            valid: validation.valid.length,
            invalid: validation.invalid.length,
          },
        });

        const deduped = deduplicateBusinessResults(validation.valid);
        progress = await bumpProgress(
          supabase,
          organizationId,
          job.id,
          progress,
          PIPELINE_PROGRESS.deduplicated,
          { pages_processed: 6 },
        );
        await appendJobLog(supabase, {
          organizationId,
          jobId: job.id,
          eventCode: "deduplication_complete",
          message: "Deduplication complete",
          sourceCode: connector.code,
          metadata: {
            progress_percent: progress,
            kept: deduped.results.length,
            removed: deduped.duplicatesRemoved,
          },
        });

        const enriched = enrichWithAiPlaceholder(deduped.results, {
          connectorCode: connector.code,
          logger,
        });

        progress = await bumpProgress(
          supabase,
          organizationId,
          job.id,
          progress,
          PIPELINE_PROGRESS.persisting,
          { pages_processed: 7 },
        );

        const persisted = await persistPipelineResults(supabase, {
          organizationId,
          jobId: job.id,
          sourceCode: connector.code,
          results: enriched,
        });

        await appendJobLog(supabase, {
          organizationId,
          jobId: job.id,
          eventCode: "persist_complete",
          message: "Persist complete",
          sourceCode: connector.code,
          metadata: {
            progress_percent: progress,
            created: persisted.companiesCreated,
            reused: persisted.companiesReused,
            inserted: persisted.resultsInserted,
            skipped: persisted.skippedDuplicates,
          },
        });

        await bumpProgress(
          supabase,
          organizationId,
          job.id,
          progress,
          PIPELINE_PROGRESS.completed,
          {
            pages_processed: PIPELINE_STAGE_COUNT,
            pages_total: PIPELINE_STAGE_COUNT,
            target_pages: PIPELINE_STAGE_COUNT,
            companies_found: persisted.resultsInserted,
            contacts_found: persisted.contactsFound,
            current_source_code: connector.code,
          },
        );

        await queueComplete(supabase, organizationId, job.id, {
          companiesFound: persisted.resultsInserted,
          contactsFound: persisted.contactsFound,
        });

        await appendJobLog(supabase, {
          organizationId,
          jobId: job.id,
          eventCode: "connector_completed",
          message: "Connector voltooid",
          sourceCode: connector.code,
          metadata: {
            progress_percent: 100,
            companies: persisted.resultsInserted,
            contacts: persisted.contactsFound,
            runtime_ms: computeRuntimeMs(claimed.started_at),
          },
        });

        return {
          success: true,
          message: `Mock scrape voltooid — ${persisted.resultsInserted} bedrijven opgeslagen (${connector.code})`,
          jobId: job.id,
          status: "completed",
          done: true,
        };
      } finally {
        await connector.disconnect();
      }
    } catch (error) {
      const message = safeErrorMessage(error);
      await queueFail(supabase, organizationId, job.id, message);
      await appendJobLog(supabase, {
        organizationId,
        jobId: job.id,
        eventCode: "job_failed",
        message: `Job failed — ${message}`,
        level: "error",
        sourceCode,
      });

      return {
        success: false,
        message,
        jobId: job.id,
        status: "failed",
        done: true,
      };
    }
  }
}

export const mockJobExecutor = new MockJobExecutor();
