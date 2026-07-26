/**
 * Service-role client — ALLEEN gebruiken in veilige server/worker-omgevingen.
 *
 * Nooit importeren in:
 * - client components ("use client")
 * - browser bundles
 * - NEXT_PUBLIC_* flows
 *
 * Deze module mag alleen vanuit server actions, route handlers of de worker
 * worden aangeroepen.
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

export function createServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY mag nooit in de browser worden gebruikt.",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn verplicht voor de service client.",
    );
  }

  if (serviceRoleKey === process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Service role key mag niet gelijk zijn aan de publishable key.",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
