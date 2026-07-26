/**
 * Veilige Supabase-verbindingscheck.
 * Gebruik: npm run check:supabase
 *
 * - Test Auth met de publishable key (publiek toegestaan)
 * - Test service role alleen server-side via admin API
 * - Print nooit de volledige keys
 */

import { createClient } from "@supabase/supabase-js";

function mask(value) {
  if (!value) return "(ontbreekt)";
  if (value.length < 12) return "(te kort / ongeldig)";
  return `${value.slice(0, 6)}…${value.slice(-4)} (lengte ${value.length})`;
}

function isPlaceholder(value) {
  if (!value) return true;
  const lowered = value.toLowerCase();
  return (
    lowered.includes("placeholder") ||
    lowered.includes("your-") ||
    lowered.includes("xxxx") ||
    value.trim() === ""
  );
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("Supabase environment check\n");
  console.log(`NEXT_PUBLIC_SUPABASE_URL              = ${url ?? "(ontbreekt)"}`);
  console.log(
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  = ${mask(publishableKey)}`,
  );
  console.log(
    `SUPABASE_SERVICE_ROLE_KEY             = ${mask(serviceRoleKey)}`,
  );
  console.log("");

  const missing = [];
  if (isPlaceholder(url)) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (isPlaceholder(publishableKey)) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  if (isPlaceholder(serviceRoleKey)) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missing.length > 0) {
    console.error("Ontbrekende of placeholder-waarden:");
    for (const key of missing) console.error(`  - ${key}`);
    console.error(
      "\nVul .env.local eerst met echte waarden uit het Supabase-dashboard.",
    );
    process.exit(1);
  }

  if (publishableKey === serviceRoleKey) {
    console.error(
      "FOUT: publishable key en service role key zijn identiek. Gebruik aparte keys.",
    );
    process.exit(1);
  }

  const publishableClient = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: publishableHealth, error: publishableError } =
    await publishableClient.auth.getSession();

  if (publishableError) {
    console.error(
      `Publishable key check mislukt: ${publishableError.message}`,
    );
    process.exit(1);
  }

  console.log(
    `Publishable key OK (session aanwezig: ${Boolean(publishableHealth.session)})`,
  );

  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: serviceError } = await serviceClient.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  if (serviceError) {
    console.error(`Service role check mislukt: ${serviceError.message}`);
    console.error(
      "Controleer of je de service_role secret hebt gekopieerd (niet de publishable key).",
    );
    process.exit(1);
  }

  console.log("Service role key OK (admin API bereikbaar)");

  const { error: schemaError } = await serviceClient
    .from("profiles")
    .select("id")
    .limit(1);

  if (schemaError) {
    if (
      schemaError.message.includes("Could not find the table") ||
      schemaError.code === "PGRST205" ||
      schemaError.message.toLowerCase().includes("schema cache") ||
      schemaError.message.toLowerCase().includes("does not exist")
    ) {
      console.log(
        "Database bereikbaar, maar migraties lijken nog niet uitgevoerd (tabel profiles ontbreekt).",
      );
      console.log(
        "Voer daarna de twee SQL-bestanden uit in de Supabase SQL Editor.",
      );
      process.exit(0);
    }

    console.error(`Schema check mislukt: ${schemaError.message}`);
    process.exit(1);
  }

  console.log("Schema OK (tabel profiles gevonden)");
  console.log("\nVerbinding geslaagd.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Onverwachte fout: ${message}`);
  process.exit(1);
});
