/**
 * Gather signals from CRM lead + company/contact intelligence + readiness.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export type LeadScoringSignals = {
  leadId: string;
  companyId: string | null;
  companyName: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  existingLeadScore: number;
  dealValue: number;
  status: string;
  tags: string[];
  ownerUserId: string | null;
  companyIntelligence: {
    healthScore: number | null;
    leadPotential: number | null;
    confidence: number | null;
    websiteQuality: number | null;
    contactQuality: number | null;
    hasSocial: boolean;
    growthCount: number;
  };
  contacts: {
    count: number;
    withEmail: number;
    withPhone: number;
    decisionMakers: number;
    avgHealth: number | null;
    avgQuality: number | null;
  };
  campaignReady: {
    qualification: number | null;
    opportunity: number | null;
    priority: number | null;
  };
  emailEngagement: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  };
  crmActivity: {
    openTasks: number;
    recentNotes: number;
    openDeals: number;
  };
};

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

export async function collectLeadScoringSignals(
  supabase: Client,
  organizationId: string,
  leadId: string,
): Promise<LeadScoringSignals> {
  const { data: lead, error } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!lead) throw new Error("Lead not found.");

  let companyIntelligence: LeadScoringSignals["companyIntelligence"] = {
    healthScore: null,
    leadPotential: null,
    confidence: null,
    websiteQuality: null,
    contactQuality: null,
    hasSocial: false,
    growthCount: 0,
  };

  if (lead.company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select(
        "intelligence_score, lead_potential_score, website_url, linkedin_url, facebook_url, instagram_url",
      )
      .eq("organization_id", organizationId)
      .eq("id", lead.company_id)
      .maybeSingle();

    const { data: profile } = await supabase
      .from("company_intelligence_profiles")
      .select(
        "health_score, lead_potential_score, confidence, online_presence_json, contact_quality_json, growth_signals_json",
      )
      .eq("organization_id", organizationId)
      .eq("company_id", lead.company_id)
      .maybeSingle();

    const online =
      profile?.online_presence_json &&
      typeof profile.online_presence_json === "object" &&
      !Array.isArray(profile.online_presence_json)
        ? (profile.online_presence_json as Record<string, unknown>)
        : {};
    const contactQ =
      profile?.contact_quality_json &&
      typeof profile.contact_quality_json === "object" &&
      !Array.isArray(profile.contact_quality_json)
        ? (profile.contact_quality_json as Record<string, unknown>)
        : {};
    const growth = Array.isArray(profile?.growth_signals_json)
      ? profile!.growth_signals_json
      : [];

    const social =
      online.social && typeof online.social === "object"
        ? (online.social as Record<string, unknown>)
        : {};

    companyIntelligence = {
      healthScore:
        asNum(profile?.health_score) ?? asNum(company?.intelligence_score),
      leadPotential:
        asNum(profile?.lead_potential_score) ??
        asNum(company?.lead_potential_score),
      confidence: asNum(profile?.confidence),
      websiteQuality: asNum(online.websiteQualityScore),
      contactQuality: asNum(contactQ.score),
      hasSocial:
        Object.values(social).some(Boolean) ||
        Boolean(company?.linkedin_url) ||
        Boolean(company?.facebook_url) ||
        Boolean(company?.instagram_url),
      growthCount: growth.length,
    };
  }

  const { data: contacts } = await supabase
    .from("crm_lead_contacts")
    .select("email, phone, is_decision_maker, health_score, quality_score")
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .limit(50);

  const contactRows = contacts ?? [];
  const healthVals = contactRows
    .map((c) => asNum(c.health_score))
    .filter((n): n is number => n != null);
  const qualityVals = contactRows
    .map((c) => asNum(c.quality_score))
    .filter((n): n is number => n != null);

  const contactSignals = {
    count: contactRows.length,
    withEmail: contactRows.filter((c) => Boolean(c.email?.trim())).length,
    withPhone: contactRows.filter((c) => Boolean(c.phone?.trim())).length,
    decisionMakers: contactRows.filter((c) => c.is_decision_maker).length,
    avgHealth:
      healthVals.length > 0
        ? Math.round(
            healthVals.reduce((a, b) => a + b, 0) / healthVals.length,
          )
        : null,
    avgQuality:
      qualityVals.length > 0
        ? Math.round(
            qualityVals.reduce((a, b) => a + b, 0) / qualityVals.length,
          )
        : null,
  };

  let campaignReady: LeadScoringSignals["campaignReady"] = {
    qualification: null,
    opportunity: null,
    priority: null,
  };
  {
    const { data: ready } = await supabase
      .from("campaign_readiness")
      .select("qualification_score, opportunity_score, priority_score")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ready) {
      campaignReady = {
        qualification: asNum(ready.qualification_score),
        opportunity: asNum(ready.opportunity_score),
        priority: asNum(ready.priority_score),
      };
    }
  }

  const { count: openTasks } = await supabase
    .from("crm_tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .neq("status", "done");

  const { count: openDeals } = await supabase
    .from("crm_deals")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .eq("status", "open");

  const emailEngagement = { sent: 0, opened: 0, clicked: 0, replied: 0 };
  if (lead.email) {
    try {
      const { count } = await supabase
        .from("email_recipients")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .ilike("email", lead.email);
      emailEngagement.sent = count ?? 0;
    } catch {
      // optional
    }
  }

  return {
    leadId: lead.id,
    companyId: lead.company_id,
    companyName: lead.company_name,
    website: lead.website,
    email: lead.email,
    phone: lead.phone,
    industry: lead.industry,
    country: lead.country,
    city: lead.city,
    existingLeadScore: lead.lead_score ?? 0,
    dealValue: Number(lead.deal_value) || 0,
    status: lead.status,
    tags: lead.tags ?? [],
    ownerUserId: lead.owner_user_id,
    companyIntelligence,
    contacts: contactSignals,
    campaignReady,
    emailEngagement,
    crmActivity: {
      openTasks: openTasks ?? 0,
      recentNotes: 0,
      openDeals: openDeals ?? 0,
    },
  };
}
