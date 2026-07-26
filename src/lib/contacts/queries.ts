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
 * Derives contact signals from persisted scrape_results payloads.
 * The contacts table is reserved for a later enrichment phase.
 */
export async function listContactSignals(
  organizationId: string,
  limit = 300,
): Promise<ContactSignal[]> {
  const supabase = await createClient();
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

  const signals: ContactSignal[] = [];

  for (const row of data ?? []) {
    const emails = readStringArray(row.raw_payload, "emails");
    const phones = readStringArray(row.raw_payload, "phones");

    for (const email of emails) {
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
