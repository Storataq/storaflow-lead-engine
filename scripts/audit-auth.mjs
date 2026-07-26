/**
 * Read-only auth foundation audit (no mutations except optional listed checks).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishableKey || !serviceRoleKey) {
  console.error("Missing env");
  process.exit(1);
}

const anon = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const service = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("=== Auth-configuratie (publieke settings) ===\n");

  const settingsRes = await fetch(`${url}/auth/v1/settings`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
  });

  if (!settingsRes.ok) {
    console.log(`Settings endpoint: HTTP ${settingsRes.status}`);
  } else {
    const settings = await settingsRes.json();
    console.log(`external.email: ${settings.external?.email ?? "?"}`);
    console.log(`disable_signup: ${settings.disable_signup ?? "?"}`);
    console.log(
      `mailer_autoconfirm: ${settings.mailer_autoconfirm ?? settings.autoconfirm ?? "?"}`,
    );
    console.log(
      `email_password_recovery: ${settings.email_password_recovery ?? settings.recovery_enabled ?? "?"}`,
    );
    console.log(
      `providers: ${JSON.stringify(Object.entries(settings.external ?? {}).filter(([, v]) => v === true).map(([k]) => k))}`,
    );
  }

  console.log("\n=== Gebruikers ===");
  const { data: usersData, error: usersError } =
    await service.auth.admin.listUsers({ page: 1, perPage: 50 });
  if (usersError) {
    console.log(`listUsers fout: ${usersError.message}`);
  } else {
    console.log(`Aantal users: ${usersData.users.length}`);
    for (const u of usersData.users) {
      console.log(
        `  - ${u.email ?? "(geen email)"} | id=${u.id.slice(0, 8)}… | confirmed=${Boolean(u.email_confirmed_at)}`,
      );
    }
  }

  console.log("\n=== Profiles vs users ===");
  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select("id,user_id,full_name,created_at");
  if (profilesError) {
    console.log(`profiles fout: ${profilesError.message}`);
  } else {
    console.log(`Aantal profiles: ${profiles.length}`);
  }

  if (!usersError && !profilesError) {
    const profileUserIds = new Set((profiles ?? []).map((p) => p.user_id));
    const usersWithoutProfile = (usersData.users ?? []).filter(
      (u) => !profileUserIds.has(u.id),
    );
    if (usersWithoutProfile.length === 0) {
      console.log("Elke user heeft een profile (of er zijn 0 users).");
    } else {
      console.log(
        `Users ZONDER profile: ${usersWithoutProfile.map((u) => u.email).join(", ")}`,
      );
    }
  }

  console.log("\n=== Organizations / members ===");
  const { data: orgs, error: orgsError } = await service
    .from("organizations")
    .select("id,name,slug,created_by");
  const { data: members, error: membersError } = await service
    .from("organization_members")
    .select("id,organization_id,user_id,role");
  console.log(
    `organizations: ${orgsError ? orgsError.message : orgs?.length ?? 0}`,
  );
  console.log(
    `organization_members: ${membersError ? membersError.message : members?.length ?? 0}`,
  );

  console.log("\n=== Auth flow probes (geen echte login) ===");
  const { error: badLogin } = await anon.auth.signInWithPassword({
    email: "auth-audit@example.invalid",
    password: "wrong-password-123456",
  });
  console.log(`Bad login: ${badLogin?.message ?? "onverwacht OK"}`);

  const { error: recoveryError } = await anon.auth.resetPasswordForEmail(
    "auth-audit@example.invalid",
    { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  );
  console.log(
    `resetPasswordForEmail beschikbaar: ${recoveryError ? recoveryError.message : "request geaccepteerd (of silent)"}`,
  );

  console.log("\n=== Env key usage sanity ===");
  console.log(
    `publishable != secret: ${publishableKey !== serviceRoleKey}`,
  );
  console.log(
    `publishable starts sb_publishable_/eyJ: ${/^(sb_publishable_|eyJ)/.test(publishableKey)}`,
  );
  console.log(
    `secret starts sb_secret_/eyJ: ${/^(sb_secret_|eyJ)/.test(serviceRoleKey)}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
