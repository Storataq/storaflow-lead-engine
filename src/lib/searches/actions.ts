"use server";

import { revalidatePath } from "next/cache";

import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import {
  parseListFromTextarea,
  searchQueryFormSchema,
} from "@/lib/searches/schema";
import { createClient } from "@/lib/supabase/server";
import type { SearchCriteriaStatus } from "@/types/database";
import type { Database } from "@/types/supabase";

export type SearchActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

type SearchQueryInsert = Database["public"]["Tables"]["search_queries"]["Insert"];
type SearchQueryUpdate = Database["public"]["Tables"]["search_queries"]["Update"];

function toLegacyScalars(input: {
  countries: string[];
  keywords: string[];
  industries: string[];
  regions: string[];
  cities: string[];
}) {
  return {
    country: input.countries[0] ?? null,
    keyword: input.keywords.join(", "),
    industry: input.industries[0] ?? null,
    region: input.regions[0] ?? null,
    city: input.cities[0] ?? null,
  };
}

function normalizeFormData(formData: FormData) {
  const countries = formData.getAll("countries").map(String).filter(Boolean);
  const industries = formData.getAll("industries").map(String).filter(Boolean);
  const languages = formData.getAll("languages").map(String).filter(Boolean);
  const sources = formData.getAll("sources").map(String).filter(Boolean);
  const keywordsFromFields = formData.getAll("keywords").map(String);
  const regionsFromFields = formData.getAll("regions").map(String);
  const citiesFromFields = formData.getAll("cities").map(String);
  const keywords =
    keywordsFromFields.length > 0
      ? parseListFromTextarea(keywordsFromFields.join("\n"))
      : parseListFromTextarea(String(formData.get("keywords") ?? ""));
  const regions =
    regionsFromFields.length > 0
      ? parseListFromTextarea(regionsFromFields.join("\n"))
      : parseListFromTextarea(String(formData.get("regions") ?? ""));
  const cities =
    citiesFromFields.length > 0
      ? parseListFromTextarea(citiesFromFields.join("\n"))
      : parseListFromTextarea(String(formData.get("cities") ?? ""));
  const searchPromptRaw = String(formData.get("search_prompt") ?? "").trim();
  const companySizeRaw = String(formData.get("company_size") ?? "");
  const status = String(formData.get("status") ?? "draft") as SearchCriteriaStatus;

  return {
    name: String(formData.get("name") ?? ""),
    search_prompt: searchPromptRaw.length > 0 ? searchPromptRaw : null,
    countries,
    industries,
    languages,
    sources,
    regions,
    cities,
    keywords,
    company_size:
      companySizeRaw === ""
        ? null
        : (companySizeRaw as "1-10" | "11-50" | "51-250" | "250+"),
    website_required: formData.get("website_required") === "on",
    linkedin_required: formData.get("linkedin_required") === "on",
    status,
  };
}

export async function createSearchQueryAction(
  _prev: SearchActionResult | null,
  formData: FormData,
): Promise<SearchActionResult> {
  const parsed = searchQueryFormSchema.safeParse(normalizeFormData(formData));
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Ongeldige invoer",
    };
  }

  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Niet ingelogd." };
  }

  const legacy = toLegacyScalars(parsed.data);
  const payload: SearchQueryInsert = {
    organization_id: context.organization.id,
    created_by: user.id,
    name: parsed.data.name,
    search_prompt: parsed.data.search_prompt ?? null,
    countries: parsed.data.countries,
    keywords: parsed.data.keywords,
    industries: parsed.data.industries,
    regions: parsed.data.regions,
    languages: parsed.data.languages,
    cities: parsed.data.cities,
    sources: parsed.data.sources,
    company_size: parsed.data.company_size ?? null,
    website_required: parsed.data.website_required,
    linkedin_required: parsed.data.linkedin_required,
    status: parsed.data.status,
    ...legacy,
  };

  const { data, error } = await supabase
    .from("search_queries")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      message: error?.message ?? "Opslaan mislukt",
    };
  }

  await supabase.from("activity_events").insert({
    organization_id: context.organization.id,
    user_id: user.id,
    event_type: "search_query.created",
    entity_type: "search_query",
    entity_id: data.id,
    description: `Zoekopdracht “${parsed.data.name}” aangemaakt`,
  });

  revalidatePath("/zoekopdrachten");
  revalidatePath(`/zoekopdrachten/${data.id}`);

  return {
    success: true,
    message: "Zoekopdracht opgeslagen.",
    id: data.id,
  };
}

export async function updateSearchQueryAction(
  _prev: SearchActionResult | null,
  formData: FormData,
): Promise<SearchActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { success: false, message: "Ongeldige zoekopdracht." };
  }

  const parsed = searchQueryFormSchema.safeParse(normalizeFormData(formData));
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Ongeldige invoer",
    };
  }

  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const legacy = toLegacyScalars(parsed.data);
  const payload: SearchQueryUpdate = {
    name: parsed.data.name,
    search_prompt: parsed.data.search_prompt ?? null,
    countries: parsed.data.countries,
    keywords: parsed.data.keywords,
    industries: parsed.data.industries,
    regions: parsed.data.regions,
    languages: parsed.data.languages,
    cities: parsed.data.cities,
    sources: parsed.data.sources,
    company_size: parsed.data.company_size ?? null,
    website_required: parsed.data.website_required,
    linkedin_required: parsed.data.linkedin_required,
    status: parsed.data.status,
    ...legacy,
  };

  const { error } = await supabase
    .from("search_queries")
    .update(payload)
    .eq("id", id)
    .eq("organization_id", context.organization.id);

  if (error) {
    return { success: false, message: error.message };
  }

  if (user) {
    await supabase.from("activity_events").insert({
      organization_id: context.organization.id,
      user_id: user.id,
      event_type: "search_query.updated",
      entity_type: "search_query",
      entity_id: id,
      description: `Zoekopdracht “${parsed.data.name}” bijgewerkt`,
    });
  }

  revalidatePath("/zoekopdrachten");
  revalidatePath(`/zoekopdrachten/${id}`);

  return {
    success: true,
    message: "Zoekopdracht opgeslagen.",
    id,
  };
}

export async function deleteSearchQueryAction(
  id: string,
): Promise<SearchActionResult> {
  const context = await getActiveOrganization();
  if (!context) {
    return { success: false, message: "Geen actieve organisatie." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("search_queries")
    .select("id,name")
    .eq("id", id)
    .eq("organization_id", context.organization.id)
    .maybeSingle();

  if (!existing) {
    return { success: false, message: "Zoekopdracht niet gevonden." };
  }

  const { error } = await supabase
    .from("search_queries")
    .delete()
    .eq("id", id)
    .eq("organization_id", context.organization.id);

  if (error) {
    const friendly =
      error.message.includes("foreign key") || error.code === "23503"
        ? "Verwijderen is niet mogelijk omdat er nog gekoppelde scrape-jobs bestaan. Verwijder of archiveer die jobs eerst."
        : error.message.includes("policy") || error.code === "42501"
          ? "Je hebt geen rechten om deze zoekopdracht te verwijderen."
          : "Verwijderen mislukt. Probeer het later opnieuw.";
    return { success: false, message: friendly };
  }

  if (user) {
    await supabase.from("activity_events").insert({
      organization_id: context.organization.id,
      user_id: user.id,
      event_type: "search_query.deleted",
      entity_type: "search_query",
      entity_id: id,
      description: `Zoekopdracht “${existing.name}” verwijderd`,
    });
  }

  revalidatePath("/zoekopdrachten");

  return {
    success: true,
    message: "Zoekopdracht verwijderd.",
  };
}
