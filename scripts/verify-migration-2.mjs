/**
 * Post-migration 2 verification: grants, tables, RLS probe, helper RPCs.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishableKey || !serviceRoleKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const service = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tables = [
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

let failed = false;

function ok(label) {
  console.log(`  ✓ ${label}`);
}
function bad(label, detail) {
  failed = true;
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("=== Fase 3/4 — post-migratie 2 controle ===\n");

  console.log("1) Grants / table access (service role):");
  for (const table of tables) {
    const { error } = await service.from(table).select("*").limit(1);
    if (error) bad(table, error.message);
    else ok(table);
  }

  console.log("\n2) Anon zonder login (RLS moet lege/geblokkeerde toegang geven, geen permission denied):");
  for (const table of ["profiles", "organizations", "companies", "contacts"]) {
    const { data, error } = await anon.from(table).select("*").limit(1);
    if (error && error.message.toLowerCase().includes("permission denied")) {
      bad(`${table} (anon)`, error.message);
    } else if (error) {
      // Other errors may still indicate RLS working (e.g. policy)
      ok(`${table} (anon) — query afgewezen/beperkt: ${error.message}`);
    } else {
      const rows = data?.length ?? 0;
      ok(`${table} (anon) — ${rows} rijen zichtbaar (verwacht 0 zonder sessie)`);
      if (rows > 0) bad(`${table} (anon) lekt data`, `${rows} rijen zichtbaar`);
    }
  }

  console.log("\n3) Helper functions:");
  for (const fn of ["is_org_member", "is_org_owner_or_admin"]) {
    const { data, error } = await anon.rpc(fn, {
      org_id: "00000000-0000-0000-0000-000000000000",
    });
    if (error && (error.code === "PGRST202" || error.message.includes("Could not find"))) {
      bad(fn, error.message);
    } else {
      ok(`${fn} (resultaat: ${error ? error.message : JSON.stringify(data)})`);
    }
  }

  console.log("\n4) Auth admin API (secret key):");
  const { data: users, error: usersError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 5,
  });
  if (usersError) bad("listUsers", usersError.message);
  else ok(`listUsers — ${users.users.length} gebruiker(s) in project`);

  console.log("\n5) Auth sign-in endpoint bereikbaar (publishable):");
  const { error: signInError } = await anon.auth.signInWithPassword({
    email: "lead-engine-connection-probe@example.invalid",
    password: "invalid-password-probe-0000",
  });
  if (!signInError) {
    bad("signIn probe", "onverwacht succes met nepcredentials");
  } else if (
    signInError.message.toLowerCase().includes("invalid") ||
    signInError.message.toLowerCase().includes("credentials") ||
    signInError.status === 400
  ) {
    ok(`Auth bereikbaar (${signInError.message})`);
  } else {
    bad("Auth bereikbaar", signInError.message);
  }

  // RLS enabled check via pg catalog isn't available over REST without a function.
  // Create a one-off probe by trying insert as anon into organizations (should fail policy/auth)
  console.log("\n6) Anon insert isolation (organizations):");
  const { error: insertError } = await anon.from("organizations").insert({
    name: "probe-should-fail",
    slug: "probe-should-fail",
  });
  if (!insertError) {
    bad("anon insert organizations", "insert onverwacht toegestaan");
  } else {
    ok(`anon insert geblokkeerd (${insertError.message})`);
  }

  if (failed) {
    console.log("\nRESULTAAT: MISLUKT — los bovenstaande issues op vóór lint/build.");
    process.exit(1);
  }

  console.log("\nRESULTAAT: GESLAAGD");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
