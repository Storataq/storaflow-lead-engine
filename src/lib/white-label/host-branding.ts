/**
 * Pre-auth branding resolution via verified custom domain RPC.
 */

import { createClient } from "@/lib/supabase/server";
import {
  mergeWhiteLabelConfig,
  type WhiteLabelConfig,
} from "@/lib/white-label/types";
import { buildThemeCss } from "@/lib/white-label/theme-engine";

export type HostBranding = {
  organizationId: string;
  hostname: string;
  config: WhiteLabelConfig;
  themeCss: string;
};

export async function resolveWhiteLabelForHostname(
  hostname: string | null | undefined,
): Promise<HostBranding | null> {
  const host = hostname?.split(":")[0]?.trim().toLowerCase();
  if (!host || host === "localhost" || host === "127.0.0.1") return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "get_public_white_label_by_hostname",
      { p_hostname: host },
    );
    if (error || !data) return null;

    const row = data as {
      organizationId?: string;
      hostname?: string;
      config?: Partial<WhiteLabelConfig> | null;
    };
    if (!row.organizationId) return null;

    const config = mergeWhiteLabelConfig(row.config ?? null, null);
    const theme = buildThemeCss(config);
    return {
      organizationId: row.organizationId,
      hostname: row.hostname ?? host,
      config,
      themeCss: theme.cssText,
    };
  } catch {
    return null;
  }
}
