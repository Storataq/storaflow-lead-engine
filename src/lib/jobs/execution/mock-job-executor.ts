/**
 * Job executor — advances queue lifecycle and runs the Scraper Engine pipeline.
 * Supports mock connectors and the live OpenStreetMap connector.
 */

import "@/lib/scraping/connectors/bootstrap";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_CONNECTOR_CODE,
  PIPELINE_PROGRESS,
  normalizeJobStatus,
} from "@/lib/jobs/constants";
import { appendJobLog } from "@/lib/jobs/logging";
import { fail as queueFail } from "@/lib/jobs/queue-service";
import type { ScrapeJobRow } from "@/lib/jobs/queries";
import { resolveJobConnectorCode } from "@/lib/jobs/resolve-connector-code";
import {
  ConnectorFactory,
  defaultConnectorFactory,
} from "@/lib/scraping/connectors/factory";
import { OPENSTREETMAP_CONNECTOR_CODE } from "@/lib/scraping/connectors/openstreetmap";
import {
  ScraperEngine,
  type ScraperEngineResult,
} from "@/lib/scraping/engine";
import type { SearchQueryRow } from "@/lib/searches/queries";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

/** @deprecated Prefer ScraperEngineResult */
export type MockJobExecutionResult = ScraperEngineResult;

export type JobExecutorOptions = {
  factory?: ConnectorFactory;
  engine?: ScraperEngine;
  workerCode?: string;
};

async function bumpProgress(
  supabase: Client,
  organizationId: string,
  jobId: string,
  currentPercent: number,
  nextPercent: number,
): Promise<void> {
  const progress = Math.max(currentPercent, nextPercent);
  await supabase
    .from("scrape_jobs")
    .update({
      progress_percent: progress,
      last_heartbeat_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", jobId);
}

/**
 * Advances one lifecycle step, or runs the full pipeline when active.
 */
export class JobExecutor {
  private readonly factory: ConnectorFactory;
  private readonly engine: ScraperEngine;
  private readonly workerCode: string;

  constructor(options: JobExecutorOptions = {}) {
    this.factory = options.factory ?? defaultConnectorFactory;
    this.workerCode = options.workerCode ?? "scraper-engine-v1";
    this.engine =
      options.engine ??
      new ScraperEngine({
        factory: this.factory,
        workerCode: this.workerCode,
      });
  }

  async advance(
    supabase: Client,
    organizationId: string,
    job: ScrapeJobRow,
    searchQuery: SearchQueryRow | null,
  ): Promise<ScraperEngineResult> {
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
      return this.engine.startSearch(supabase, organizationId, job.id);
    }

    if (status === "queued") {
      return this.activate(supabase, organizationId, job, searchQuery);
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

    const sourceCode =
      job.current_source_code ??
      resolveJobConnectorCode(searchQuery.sources ?? []);
    const mode =
      sourceCode === OPENSTREETMAP_CONNECTOR_CODE ? "live" : "mock";

    return this.engine.runConnectorPipeline(
      supabase,
      organizationId,
      job,
      searchQuery,
      {
        organizationId,
        jobId: job.id,
        mode,
        cancellation: {
          isCancelled: () => false,
        },
      },
    );
  }

  private async activate(
    supabase: Client,
    organizationId: string,
    job: ScrapeJobRow,
    searchQuery: SearchQueryRow | null,
  ): Promise<ScraperEngineResult> {
    const sourceHint =
      job.current_source_code ??
      (searchQuery
        ? resolveJobConnectorCode(searchQuery.sources ?? [])
        : DEFAULT_CONNECTOR_CODE);

    const now = new Date().toISOString();
    const { data: activated, error } = await supabase
      .from("scrape_jobs")
      .update({
        status: "active",
        started_at: job.started_at ?? now,
        claimed_at: now,
        claimed_by: this.workerCode,
        last_heartbeat_at: now,
        pages_processed: 0,
        progress_percent: Math.max(
          job.progress_percent,
          PIPELINE_PROGRESS.queued,
        ),
        pages_total: 8,
        target_pages: 8,
        current_source_code: sourceHint,
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
      metadata: { claimed_by: this.workerCode },
    });

    await bumpProgress(
      supabase,
      organizationId,
      job.id,
      activated.progress_percent,
      PIPELINE_PROGRESS.queued,
    );

    return {
      success: true,
      message: "Active",
      jobId: job.id,
      status: "active",
      done: false,
    };
  }
}

/** @deprecated Prefer JobExecutor — kept for existing imports. */
export class MockJobExecutor extends JobExecutor {}

export const defaultJobExecutor = new JobExecutor();
export const defaultMockJobExecutor = defaultJobExecutor;
/** @deprecated Prefer defaultJobExecutor */
export const mockJobExecutor = defaultJobExecutor;
