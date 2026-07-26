import { createClient } from "@/lib/supabase/server";

export type ContactSignal = {
  id: string;
  companyId: string | null;
  companyName: string;
  contactType: "email" | "phone";
  value: string;
  sourceCode: string | null;
  city: string | null;
  country: string | null;
  foundAt: string;
};

function readStringArray(payload: unknown, key: string): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }
  const value = (payload as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Contact signals from persisted contacts table (website enrichment)
 * plus scrape_results payloads.
 */
export async function listContactSignals(
  organizationId: string,
  limit = 300,
): Promise<ContactSignal[]> {
  const supabase = await createClient();
  const signals: ContactSignal[] = [];
  const seen = new Set<string>();

  const { data: contactRows, error: contactsError } = await supabase
    .from("contacts")
    .select(
      "id, company_id, contact_type, contact_value, created_at",
    )
    .eq("organization_id", organizationId)
    .in("contact_type", ["email", "phone"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (contactsError) {
    throw new Error(contactsError.message);
  }

  const companyIds = [
    ...new Set(
      (contactRows ?? [])
        .map((row) => row.company_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const companyMap = new Map<
    string,
    { company_name: string; city: string | null; country: string | null }
  >();
  if (companyIds.length) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, company_name, city, country")
      .eq("organization_id", organizationId)
      .in("id", companyIds.slice(0, 200));
    for (const company of companies ?? []) {
      companyMap.set(company.id, {
        company_name: company.company_name,
        city: company.city,
        country: company.country,
      });
    }
  }

  for (const row of contactRows ?? []) {
    if (row.contact_type !== "email" && row.contact_type !== "phone") continue;
    const key = `${row.contact_type}:${row.contact_value.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const company = row.company_id ? companyMap.get(row.company_id) : null;
    signals.push({
      id: row.id,
      companyId: row.company_id,
      companyName: company?.company_name ?? "Onbekend bedrijf",
      contactType: row.contact_type,
      value: row.contact_value,
      sourceCode: "website_crawler",
      city: company?.city ?? null,
      country: company?.country ?? null,
      foundAt: row.created_at,
    });
  }

  if (signals.length >= limit) return signals.slice(0, limit);

  const { data, error } = await supabase
    .from("scrape_results")
    .select(
      "id, company_id, company_name, city, country, source_code, raw_payload, created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const emails = readStringArray(row.raw_payload, "emails");
    const phones = readStringArray(row.raw_payload, "phones");

    for (const email of emails) {
      const key = `email:${email.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      signals.push({
        id: `${row.id}-email-${email}`,
        companyId: row.company_id,
        companyName: row.company_name,
        contactType: "email",
        value: email,
        sourceCode: row.source_code,
        city: row.city,
        country: row.country,
        foundAt: row.created_at,
      });
    }

    for (const phone of phones) {
      const key = `phone:${phone}`;
      if (seen.has(key)) continue;
      seen.add(key);
      signals.push({
        id: `${row.id}-phone-${phone}`,
        companyId: row.company_id,
        companyName: row.company_name,
        contactType: "phone",
        value: phone,
        sourceCode: row.source_code,
        city: row.city,
        country: row.country,
        foundAt: row.created_at,
      });
    }

    if (signals.length >= limit) break;
  }

  return signals.slice(0, limit);
}

export async function countContactSignals(
  organizationId: string,
): Promise<number> {
  const signals = await listContactSignals(organizationId, 500);
  return signals.length;
}
