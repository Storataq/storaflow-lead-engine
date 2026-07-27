/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";

type SupabaseLike = any;

async function getReadClient(): Promise<SupabaseLike> {
  // UI reads use the user-scoped client so pages work without service role
  // and RLS still scopes data to the signed-in member.
  return (await createClient()) as unknown as SupabaseLike;
}

export async function listEmailCampaignExecutions(input: {
  organizationId: string;
  limit?: number;
}): Promise<any[]> {
  const supabase = await getReadClient();
  const { data, error } = await supabase
    .from("email_campaign_executions")
    .select("*")
    .eq("organization_id", input.organizationId)
    .order("updated_at", { ascending: false })
    .limit(input.limit ?? 50);
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function getEmailCampaignExecution(input: {
  organizationId: string;
  executionId: string;
}): Promise<any | null> {
  const supabase = await getReadClient();
  const { data, error } = await supabase
    .from("email_campaign_executions")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.executionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function listSequenceEnrollmentsForExecution(input: {
  organizationId: string;
  executionId: string;
  limit?: number;
}): Promise<any[]> {
  const supabase = await getReadClient();
  const { data, error } = await supabase
    .from("email_sequence_enrollments")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("campaign_execution_id", input.executionId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 100);
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function getSequenceEnrollment(input: {
  organizationId: string;
  enrollmentId: string;
}): Promise<any | null> {
  const supabase = await getReadClient();
  const { data, error } = await supabase
    .from("email_sequence_enrollments")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.enrollmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function listExecutionQueueJobs(input: {
  organizationId: string;
  limit?: number;
  status?: string;
}): Promise<any[]> {
  const supabase = await getReadClient();
  let query = supabase
    .from("email_queue_jobs")
    .select("*")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 100);
  if (input.status) {
    query = query.eq("status", input.status);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function listSequenceEnrollments(input: {
  organizationId: string;
  limit?: number;
}): Promise<any[]> {
  const supabase = await getReadClient();
  const { data, error } = await supabase
    .from("email_sequence_enrollments")
    .select("*")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 100);
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}
