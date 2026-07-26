/**
 * Schema verification after migration 1.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const expectedTables = [
  "profiles",
  "organizations",
  "organization_members",
  "organization_settings",
  "search_queries",
  "scrape_jobs",
  "scrape_sources",
  "companies",
  "contacts",
  "company_sources",
  "exclusion_list",
  "scrape_errors",
  "activity_events",
  "export_runs",
];

async function main() {
  console.log("=== Migratie 1 — schema-controle ===\n");

  const present = [];
  const missing = [];

  for (const table of expectedTables) {
    const { error } = await supabase.from(table).select("*").limit(0);
    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("could not find") ||
        msg.includes("does not exist") ||
        error.code === "PGRST205" ||
        error.code === "42P01"
      ) {
        missing.push(`${table} (${error.code ?? "?"} ${error.message})`);
      } else {
        present.push(`${table} (bereikbaar; melding: ${error.message})`);
      }
    } else {
      present.push(table);
    }
  }

  console.log(`Tabellen aanwezig (${present.length}/${expectedTables.length}):`);
  for (const t of present) console.log(`  ✓ ${t}`);
  if (missing.length) {
    console.log(`\nTabellen ontbrekend (${missing.length}):`);
    for (const t of missing) console.log(`  ✗ ${t}`);
  }

  console.log("\nFuncties (via RPC-probe):");
  for (const fn of ["is_org_member", "is_org_owner_or_admin"]) {
    const { error } = await supabase.rpc(fn, {
      org_id: "00000000-0000-0000-0000-000000000000",
    });
    if (!error) {
      console.log(`  ✓ ${fn}`);
    } else if (
      error.message.toLowerCase().includes("could not find") ||
      error.code === "PGRST202"
    ) {
      console.log(`  ✗ ${fn} ontbreekt (${error.message})`);
    } else {
      console.log(`  ✓ ${fn} (bestaat; ${error.message})`);
    }
  }

  if (missing.length > 0) {
    console.log("\nMigratie 1-controle: MISLUKT");
    process.exit(1);
  }

  console.log("\nMigratie 1-controle: GESLAAGD");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
