import type { SupabaseClient } from "@supabase/supabase-js";

import type { ScrapeJobLogLevel } from "@/types/database";
import type { Database, Json } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export type AppendJobLogInput = {
  organizationId: string;
  jobId: string;
  eventCode: string;
  message: string;
  level?: ScrapeJobLogLevel;
  sourceCode?: string | null;
  metadata?: Json;
};

/**
 * Append-only job timeline. Failures are soft — logging must not break the job.
 */
export async function appendJobLog(
  supabase: Client,
  input: AppendJobLogInput,
): Promise<void> {
  const { error } = await supabase.from("scrape_job_logs").insert({
    organization_id: input.organizationId,
    scrape_job_id: input.jobId,
    level: input.level ?? "info",
    event_code: input.eventCode,
    message: input.message,
    source_code: input.sourceCode ?? null,
    metadata_json: input.metadata ?? {},
  });

  if (error) {
    console.error("[scrape_job_logs]", error.message);
  }
}
