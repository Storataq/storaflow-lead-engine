/**
 * Scraper Engine — provider-independent orchestration for Phase 20B.
 *
 * Responsibilities: start / stop / retry / cancel / resume via queue-service,
 * connector selection, normalize → validate → dedupe → persist, progress + logs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  PIPELINE_PROGRESS,
  PIPELINE_STAGE_COUNT,
  computeRuntimeMs,
} from "@/lib/jobs/constants";
import { persistPipelineResults } from "@/lib/jobs/execution/persist-results";
import { appendJobLog } from "@/lib/jobs/logging";
import {
  cancel as queueCancel,
  complete as queueComplete,
  enqueue,
  fail as queueFail,
  pause as queuePause,
  resume as queueResume,
  retry as queueRetry,
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
import { OPENSTREETMAP_CONNECTOR_CODE } from "@/lib/scraping/connectors/openstreetmap";
import { InMemoryConnectorLogger } from "@/lib/scraping/connectors/logger";
import { enrichWithAiPlaceholder } from "@/lib/scraping/connectors/pipeline/ai-enrichment";
import { deduplicateBusinessResults } from "@/lib/scraping/connectors/pipeline/deduplicator";
import { normalizeBusinessResults } from "@/lib/scraping/connectors/pipeline/normalizer";
import { parseSearchResults } from "@/lib/scraping/connectors/pipeline/parser";
import { validateBusinessResults } from "@/lib/scraping/connectors/pipeline/validator";
import type { ConnectorExecutionContext } from "@/lib/scraping/connectors/readiness";
import type { ConnectorSearchInput } from "@/lib/scraping/connectors/types";
import type { SearchQueryRow } from "@/lib/searches/queries";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export type ScraperEngineResult = {
  success: boolean;
  message: string;
  jobId: string;
  status?: string;
  done: boolean;
  statistics?: {
    fetched: number;
    normalized: number;
    duplicatesRemoved: number;
    companiesCreated: number;
    companiesReused: number;
    contactsCreated: number;
    resultsInserted: number;
  };
};

export type ScraperEngineOptions = {
  factory?: ConnectorFactory;
  workerCode?: string;
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

export function buildConnectorSearchInput(
  searchQuery: SearchQueryRow,
): ConnectorSearchInput {
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
  factory: ConnectorFactory,
  job: ScrapeJobRow,
  searchQuery: SearchQueryRow,
): string {
  if (job.current_source_code && factory.tryCreate(job.current_source_code)) {
    return job.current_source_code;
  }
  return resolveJobConnectorCode(searchQuery.sources ?? []);
}

function isLiveConnector(code: string): boolean {
  return code === OPENSTREETMAP_CONNECTOR_CODE;
}

export class ScraperEngine {
  private readonly factory: ConnectorFactory;
  private readonly workerCode: string;

  constructor(options: ScraperEngineOptions = {}) {
    this.factory = options.factory ?? defaultConnectorFactory;
    this.workerCode = options.workerCode ?? "scraper-engine-v1";
  }

  /** Enqueue a draft/pending job. */
  async startSearch(
    supabase: Client,
    organizationId: string,
    jobId: string,
  ): Promise<ScraperEngineResult> {
    const queued = await enqueue(supabase, organizationId, jobId);
    if (queued.success && queued.job) {
      await bumpProgress(
        supabase,
        organizationId,
        jobId,
        queued.job.progress_percent,
        PIPELINE_PROGRESS.queued,
      );
      await appendJobLog(supabase, {
        organizationId,
        jobId,
        eventCode: "search_queued",
        message: "Search queued",
        metadata: { worker: this.workerCode },
      });
    }
    return {
      success: queued.success,
      message: queued.message,
      jobId,
      status: "queued",
      done: false,
    };
  }

  async pauseSearch(
    supabase: Client,
    organizationId: string,
    jobId: string,
  ): Promise<ScraperEngineResult> {
    const result = await queuePause(supabase, organizationId, jobId);
    if (result.success) {
      await appendJobLog(supabase, {
        organizationId,
        jobId,
        eventCode: "search_paused",
        message: "Search paused",
      });
    }
    return {
      success: result.success,
      message: result.message,
      jobId,
      status: "paused",
      done: true,
    };
  }

  async resumeSearch(
    supabase: Client,
    organizationId: string,
    jobId: string,
  ): Promise<ScraperEngineResult> {
    const result = await queueResume(supabase, organizationId, jobId);
    if (result.success) {
      await appendJobLog(supabase, {
        organizationId,
        jobId,
        eventCode: "search_resumed",
        message: "Search resumed",
      });
    }
    return {
      success: result.success,
      message: result.message,
      jobId,
      status: "queued",
      done: false,
    };
  }

  async cancelSearch(
    supabase: Client,
    organizationId: string,
    jobId: string,
  ): Promise<ScraperEngineResult> {
    const result = await queueCancel(supabase, organizationId, jobId);
    if (result.success) {
      await appendJobLog(supabase, {
        organizationId,
        jobId,
        eventCode: "search_cancelled",
        message: "Search cancelled",
        level: "warn",
      });
    }
    return {
      success: result.success,
      message: result.message,
      jobId,
      status: "cancelled",
      done: true,
    };
  }

  async retrySearch(
    supabase: Client,
    organizationId: string,
    jobId: string,
  ): Promise<ScraperEngineResult> {
    const result = await queueRetry(supabase, organizationId, jobId);
    if (result.success && result.job) {
      await appendJobLog(supabase, {
        organizationId,
        jobId: result.job.id,
        eventCode: "search_retry",
        message: "Search retry queued",
        metadata: { previous_job_id: jobId },
      });
      return {
        success: true,
        message: result.message,
        jobId: result.job.id,
        status: "queued",
        done: false,
      };
    }
    return {
      success: result.success,
      message: result.message,
      jobId,
      done: true,
    };
  }

  async stopSearch(
    supabase: Client,
    organizationId: string,
    jobId: string,
  ): Promise<ScraperEngineResult> {
    return this.cancelSearch(supabase, organizationId, jobId);
  }

  /**
   * Claim queued → active, then run connector pipeline to completion.
   */
  async runConnectorPipeline(
    supabase: Client,
    organizationId: string,
    job: ScrapeJobRow,
    searchQuery: SearchQueryRow,
    context?: Partial<ConnectorExecutionContext>,
  ): Promise<ScraperEngineResult> {
    const sourceCode = resolveSourceCode(this.factory, job, searchQuery);
    const mode = context?.mode ?? (isLiveConnector(sourceCode) ? "live" : "mock");

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
        claimed_by: job.claimed_by ?? this.workerCode,
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
      return {
        success: true,
        message: "Pipeline wordt al uitgevoerd…",
        jobId: job.id,
        status: "active",
        done: false,
      };
    }

    if (context?.cancellation?.isCancelled()) {
      await this.cancelSearch(supabase, organizationId, job.id);
      return {
        success: true,
        message: "Search cancelled before connector start",
        jobId: job.id,
        status: "cancelled",
        done: true,
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
        eventCode: "worker_started",
        message: "Worker started",
        sourceCode,
        metadata: { worker: this.workerCode, mode },
      });

      await appendJobLog(supabase, {
        organizationId,
        jobId: job.id,
        eventCode: "connector_started",
        message: "Connector started",
        sourceCode,
        metadata: { mode },
      });

      const connector = this.factory.create(sourceCode);
      const logger = new InMemoryConnectorLogger();
      const input = buildConnectorSearchInput(searchQuery);

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
            mode,
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
          eventCode: "companies_found",
          message: "Companies found",
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
          eventCode: "duplicates_detected",
          message: "Duplicate detection complete",
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
          mode,
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
            contacts: persisted.contactsCreated,
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
          eventCode: "search_completed",
          message: "Search completed",
          sourceCode: connector.code,
          metadata: {
            progress_percent: 100,
            companies: persisted.resultsInserted,
            contacts: persisted.contactsFound,
            mode,
            runtime_ms: computeRuntimeMs(claimed.started_at),
          },
        });

        const label = mode === "live" ? "Live scrape" : "Mock scrape";
        return {
          success: true,
          message: `${label} voltooid — ${persisted.resultsInserted} bedrijven (${connector.code})`,
          jobId: job.id,
          status: "completed",
          done: true,
          statistics: {
            fetched: searched.total,
            normalized: normalized.length,
            duplicatesRemoved: deduped.duplicatesRemoved,
            companiesCreated: persisted.companiesCreated,
            companiesReused: persisted.companiesReused,
            contactsCreated: persisted.contactsCreated,
            resultsInserted: persisted.resultsInserted,
          },
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

export const defaultScraperEngine = new ScraperEngine({
  workerCode: "scraper-engine-v1",
});
