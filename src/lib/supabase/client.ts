import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/supabase";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY zijn verplicht.",
    );
  }

  // Publishable key is veilig voor clientgebruik (RLS blijft van toepassing).
  return createBrowserClient<Database>(url, publishableKey);
}
