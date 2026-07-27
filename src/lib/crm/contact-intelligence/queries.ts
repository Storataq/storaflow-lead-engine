/**
 * Read helpers for contact intelligence.
 */

import type { ContactIntelligenceListFilters } from "@/lib/crm/contact-intelligence/types";
import type {
  ContactIntelligenceProfileRow,
  ContactIntelligenceRunRow,
} from "@/lib/crm/contact-intelligence/types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type CrmLeadContactWithIntelligence =
  Database["public"]["Tables"]["crm_lead_contacts"]["Row"] & {
    lead?: {
      id: string;
      company_name: string;
      status: string;
    } | null;
  };

export async function getContactIntelligenceProfile(
  organizationId: string,
  contactId: string,
): Promise<ContactIntelligenceProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_intelligence_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getLatestContactIntelligenceRun(
  organizationId: string,
  contactId: string,
): Promise<ContactIntelligenceRunRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_intelligence_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCrmLeadContact(
  organizationId: string,
  contactId: string,
): Promise<CrmLeadContactWithIntelligence | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_lead_contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", contactId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, company_name, status")
    .eq("organization_id", organizationId)
    .eq("id", data.lead_id)
    .maybeSingle();

  return { ...data, lead: lead ?? null };
}

export async function listIntelligentContacts(
  organizationId: string,
  filters: ContactIntelligenceListFilters = {},
  limit = 100,
): Promise<CrmLeadContactWithIntelligence[]> {
  const supabase = await createClient();
  let query = supabase
    .from("crm_lead_contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("quality_score", { ascending: false })
    .limit(limit);

  if (filters.decisionMaker === true) {
    query = query.eq("is_decision_maker", true);
  }
  if (filters.department) {
    query = query.ilike("department", filters.department);
  }
  if (filters.managementLevel) {
    query = query.ilike("management_level", filters.managementLevel);
  }
  if (filters.minHealthScore != null) {
    query = query.gte("health_score", filters.minHealthScore);
  }
  if (filters.minQualityScore != null) {
    query = query.gte("quality_score", filters.minQualityScore);
  }
  if (filters.minConfidence != null) {
    query = query.gte("intelligence_confidence", filters.minConfidence);
  }
  if (filters.country) {
    query = query.ilike("country", `%${filters.country}%`);
  }
  if (filters.language) {
    query = query.eq("primary_language", filters.language);
  }
  if (filters.preferredChannel) {
    query = query.eq("preferred_channel", filters.preferredChannel);
  }
  if (filters.q) {
    const q = filters.q.trim();
    if (q) {
      query = query.or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,job_title.ilike.%${q}%`,
      );
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const contacts = data ?? [];
  const leadIds = [...new Set(contacts.map((c) => c.lead_id))];
  const leadMap = new Map<string, { id: string; company_name: string; status: string }>();

  if (leadIds.length) {
    const { data: leads } = await supabase
      .from("crm_leads")
      .select("id, company_name, status")
      .eq("organization_id", organizationId)
      .in("id", leadIds);
    for (const lead of leads ?? []) {
      leadMap.set(lead.id, lead);
    }
  }

  return contacts.map((c) => ({
    ...c,
    lead: leadMap.get(c.lead_id) ?? null,
  }));
}

export type ContactIntelligenceDashboardStats = {
  topContacts: CrmLeadContactWithIntelligence[];
  recentlyActive: CrmLeadContactWithIntelligence[];
  bestDecisionMakers: CrmLeadContactWithIntelligence[];
  highestScores: CrmLeadContactWithIntelligence[];
  missingInformation: CrmLeadContactWithIntelligence[];
  hotLeads: CrmLeadContactWithIntelligence[];
};

export async function getContactIntelligenceDashboard(
  organizationId: string,
): Promise<ContactIntelligenceDashboardStats> {
  const supabase = await createClient();

  const { data: all, error } = await supabase
    .from("crm_lead_contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  const rows = all ?? [];

  const leadIds = [...new Set(rows.map((c) => c.lead_id))];
  const leadMap = new Map<string, { id: string; company_name: string; status: string }>();
  if (leadIds.length) {
    const { data: leads } = await supabase
      .from("crm_leads")
      .select("id, company_name, status")
      .eq("organization_id", organizationId)
      .in("id", leadIds);
    for (const lead of leads ?? []) leadMap.set(lead.id, lead);
  }

  const withLead = (list: typeof rows) =>
    list.map((c) => ({ ...c, lead: leadMap.get(c.lead_id) ?? null }));

  const byQuality = [...rows].sort(
    (a, b) => Number(b.quality_score ?? 0) - Number(a.quality_score ?? 0),
  );
  const byHealth = [...rows].sort(
    (a, b) => Number(b.health_score ?? 0) - Number(a.health_score ?? 0),
  );

  return {
    topContacts: withLead(byQuality.slice(0, 8)),
    recentlyActive: withLead(rows.slice(0, 8)),
    bestDecisionMakers: withLead(
      rows
        .filter((c) => c.is_decision_maker)
        .sort(
          (a, b) =>
            Number(b.quality_score ?? 0) - Number(a.quality_score ?? 0),
        )
        .slice(0, 8),
    ),
    highestScores: withLead(byHealth.slice(0, 8)),
    missingInformation: withLead(
      rows
        .filter((c) => !c.email || !c.job_title || !c.phone)
        .slice(0, 8),
    ),
    hotLeads: withLead(
      rows
        .filter((c) => {
          const badges = c.badges_json;
          if (!Array.isArray(badges)) return false;
          return badges.some(
            (b) =>
              typeof b === "object" &&
              b &&
              "code" in b &&
              (b as { code: string }).code === "hot_lead",
          );
        })
        .slice(0, 8),
    ),
  };
}
