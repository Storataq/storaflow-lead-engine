/**
 * Non-throwing helper for future pipelines.
 */

import { applyContactIntelligenceResult } from "@/lib/crm/contact-intelligence/apply";
import type { IntelligenceSource } from "@/lib/crm/contact-intelligence/constants";
import { generateContactIntelligence } from "@/lib/crm/contact-intelligence/generate";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export async function runContactIntelligenceInBackground(input: {
  organizationId: string;
  contactId: string;
  leadId: string;
  supabase: Client;
  source?: IntelligenceSource;
  useAi?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const started = Date.now();
    const { result } = await generateContactIntelligence({
      organizationId: input.organizationId,
      contactId: input.contactId,
      supabase: input.supabase,
      useAi: input.useAi ?? true,
    });
    await applyContactIntelligenceResult(input.supabase, {
      organizationId: input.organizationId,
      contactId: input.contactId,
      leadId: input.leadId,
      result,
      source: input.source ?? "lead",
      durationMs: Date.now() - started,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Contact intelligence failed",
    };
  }
}
