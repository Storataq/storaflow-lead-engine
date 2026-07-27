/**
 * Gather signals for CRM contact intelligence.
 */

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export type ContactIntelligenceSignals = {
  contactId: string;
  organizationId: string;
  leadId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  leadCompanyName: string | null;
  leadStatus: string | null;
  leadScore: number | null;
  leadCountry: string | null;
  leadCity: string | null;
  leadIndustry: string | null;
  leadOwnerId: string | null;
  noteCount: number;
  taskCount: number;
  completedTaskCount: number;
  activityCount: number;
  dealCount: number;
  recentNoteAt: string | null;
  recentTaskAt: string | null;
  recentActivityAt: string | null;
  activities: Array<{
    id: string;
    eventType: string;
    description: string;
    createdAt: string;
  }>;
  notes: Array<{ id: string; createdAt: string; preview: string }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

export async function buildContactIntelligenceSignals(
  organizationId: string,
  contactId: string,
  supabase?: Client,
): Promise<ContactIntelligenceSignals> {
  const client = supabase ?? (await createClient());

  const { data: contact, error } = await client
    .from("crm_lead_contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", contactId)
    .maybeSingle();

  if (error || !contact) {
    throw new Error(error?.message ?? "Contact not found.");
  }

  const { data: lead } = await client
    .from("crm_leads")
    .select(
      "id, company_name, status, lead_score, country, city, industry, owner_user_id",
    )
    .eq("organization_id", organizationId)
    .eq("id", contact.lead_id)
    .maybeSingle();

  const [
    { data: notes },
    { data: tasks },
    { data: activities },
    { data: deals },
  ] = await Promise.all([
    client
      .from("crm_notes")
      .select("id, body_text, created_at")
      .eq("organization_id", organizationId)
      .eq("lead_id", contact.lead_id)
      .order("created_at", { ascending: false })
      .limit(20),
    client
      .from("crm_tasks")
      .select("id, title, status, created_at, updated_at")
      .eq("organization_id", organizationId)
      .eq("lead_id", contact.lead_id)
      .order("created_at", { ascending: false })
      .limit(20),
    client
      .from("activity_events")
      .select("id, event_type, description, created_at")
      .eq("organization_id", organizationId)
      .eq("entity_type", "crm_lead")
      .eq("entity_id", contact.lead_id)
      .order("created_at", { ascending: false })
      .limit(30),
    client
      .from("crm_deals")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("lead_id", contact.lead_id)
      .limit(50),
  ]);

  const noteRows = notes ?? [];
  const taskRows = tasks ?? [];
  const activityRows = activities ?? [];
  const completedTaskCount = taskRows.filter((t) => t.status === "done").length;

  return {
    contactId: contact.id,
    organizationId,
    leadId: contact.lead_id,
    firstName: contact.first_name,
    lastName: contact.last_name,
    fullName: `${contact.first_name} ${contact.last_name}`.trim() || "Unnamed",
    jobTitle: contact.job_title,
    email: contact.email,
    phone: contact.phone,
    linkedinUrl: contact.linkedin_url,
    isPrimary: contact.is_primary,
    createdAt: contact.created_at,
    updatedAt: contact.updated_at,
    leadCompanyName: lead?.company_name ?? null,
    leadStatus: lead?.status ?? null,
    leadScore: lead?.lead_score != null ? Number(lead.lead_score) : null,
    leadCountry: lead?.country ?? null,
    leadCity: lead?.city ?? null,
    leadIndustry: lead?.industry ?? null,
    leadOwnerId: lead?.owner_user_id ?? null,
    noteCount: noteRows.length,
    taskCount: taskRows.length,
    completedTaskCount,
    activityCount: activityRows.length,
    dealCount: (deals ?? []).length,
    recentNoteAt: noteRows[0]?.created_at ?? null,
    recentTaskAt: taskRows[0]?.created_at ?? null,
    recentActivityAt: activityRows[0]?.created_at ?? null,
    activities: activityRows.map((a) => ({
      id: a.id,
      eventType: a.event_type,
      description: a.description,
      createdAt: a.created_at,
    })),
    notes: noteRows.map((n) => ({
      id: n.id,
      createdAt: n.created_at,
      preview: (n.body_text ?? "").slice(0, 120),
    })),
    tasks: taskRows.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    })),
  };
}
