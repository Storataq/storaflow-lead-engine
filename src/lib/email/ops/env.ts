/**
 * Phase 21L — environment validation (no secret values returned).
 */

import { envFlag, redactSecret } from "@/lib/email/ops/security";

export type EnvCheck = {
  key: string;
  category: "required_prod" | "feature" | "optional" | "secret" | "public";
  ok: boolean;
  blocking: boolean;
  message: string;
};

export type EnvValidationResult = {
  ready: boolean;
  blockingErrors: EnvCheck[];
  warnings: EnvCheck[];
  checks: EnvCheck[];
};

function present(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

function check(
  key: string,
  category: EnvCheck["category"],
  ok: boolean,
  blocking: boolean,
  message: string,
): EnvCheck {
  return { key, category, ok, blocking, message };
}

export function validateEmailEnvironment(input?: {
  production?: boolean;
}): EnvValidationResult {
  const production =
    input?.production ??
    (envFlag("EMAIL_PRODUCTION_MODE") || process.env.NODE_ENV === "production");

  const checks: EnvCheck[] = [];

  checks.push(
    check(
      "NEXT_PUBLIC_SUPABASE_URL",
      "public",
      present("NEXT_PUBLIC_SUPABASE_URL"),
      true,
      present("NEXT_PUBLIC_SUPABASE_URL") ? "Set" : "Missing Supabase URL",
    ),
  );
  checks.push(
    check(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "public",
      present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
      true,
      present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
        ? "Set"
        : "Missing publishable key",
    ),
  );
  checks.push(
    check(
      "SUPABASE_SERVICE_ROLE_KEY",
      "secret",
      present("SUPABASE_SERVICE_ROLE_KEY"),
      true,
      present("SUPABASE_SERVICE_ROLE_KEY")
        ? `Present ${redactSecret(process.env.SUPABASE_SERVICE_ROLE_KEY)}`
        : "Missing service-role key",
    ),
  );

  const dispatchWanted = envFlag("EMAIL_PROVIDER_DISPATCH_ENABLED");
  checks.push(
    check(
      "RESEND_API_KEY",
      "secret",
      present("RESEND_API_KEY"),
      dispatchWanted,
      present("RESEND_API_KEY")
        ? `Present ${redactSecret(process.env.RESEND_API_KEY)}`
        : dispatchWanted
          ? "Required when provider dispatch is enabled"
          : "Optional while dispatch disabled",
    ),
  );
  checks.push(
    check(
      "RESEND_WEBHOOK_SECRET",
      "secret",
      present("RESEND_WEBHOOK_SECRET"),
      envFlag("EMAIL_WEBHOOK_PROCESSING_ENABLED", true) && production,
      present("RESEND_WEBHOOK_SECRET")
        ? `Present ${redactSecret(process.env.RESEND_WEBHOOK_SECRET)}`
        : "Missing webhook secret",
    ),
  );
  checks.push(
    check(
      "EMAIL_TRACKING_SECRET",
      "secret",
      present("EMAIL_TRACKING_SECRET"),
      envFlag("EMAIL_TRACKING_ENABLED", true),
      present("EMAIL_TRACKING_SECRET")
        ? `Present ${redactSecret(process.env.EMAIL_TRACKING_SECRET)}`
        : "Missing tracking secret (fail closed)",
    ),
  );
  checks.push(
    check(
      "EMAIL_EXECUTION_INTERNAL_SECRET",
      "secret",
      present("EMAIL_EXECUTION_INTERNAL_SECRET"),
      envFlag("EMAIL_WORKER_ENABLED", true) ||
        envFlag("EMAIL_SCHEDULER_ENABLED", true),
      present("EMAIL_EXECUTION_INTERNAL_SECRET")
        ? `Present ${redactSecret(process.env.EMAIL_EXECUTION_INTERNAL_SECRET)}`
        : "Missing scheduler/worker secret",
    ),
  );
  checks.push(
    check(
      "EMAIL_HEALTH_SECRET",
      "secret",
      present("EMAIL_HEALTH_SECRET"),
      false,
      present("EMAIL_HEALTH_SECRET")
        ? `Present ${redactSecret(process.env.EMAIL_HEALTH_SECRET)}`
        : "Optional; health endpoints reject when unset",
    ),
  );

  if (envFlag("EMAIL_AI_ENABLED")) {
    checks.push(
      check(
        "OPENAI_API_KEY",
        "secret",
        present("OPENAI_API_KEY"),
        true,
        present("OPENAI_API_KEY")
          ? `Present ${redactSecret(process.env.OPENAI_API_KEY)}`
          : "AI enabled but OPENAI_API_KEY missing",
      ),
    );
  }

  if (production && envFlag("EMAIL_PROVIDER_DISPATCH_ENABLED")) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
    checks.push(
      check(
        "NEXT_PUBLIC_APP_URL",
        "public",
        appUrl.startsWith("https://"),
        true,
        appUrl.startsWith("https://")
          ? "HTTPS app URL"
          : "Production dispatch requires HTTPS NEXT_PUBLIC_APP_URL",
      ),
    );
  }

  if (envFlag("EMAIL_EMERGENCY_STOP")) {
    checks.push(
      check(
        "EMAIL_EMERGENCY_STOP",
        "optional",
        false,
        true,
        "Global emergency stop is active via environment",
      ),
    );
  }

  const blockingErrors = checks.filter((c) => !c.ok && c.blocking);
  const warnings = checks.filter((c) => !c.ok && !c.blocking);

  return {
    ready: blockingErrors.length === 0,
    blockingErrors,
    warnings,
    checks,
  };
}
