/**
 * White label queries — org-scoped only.
 */

import { createClient } from "@/lib/supabase/server";
import {
  mergeWhiteLabelConfig,
  type WhiteLabelConfig,
  type WhiteLabelAssetRow,
  type CustomDomainRow,
  type PartnerAccountRow,
} from "@/lib/white-label/types";
import { buildThemeCss } from "@/lib/white-label/theme-engine";
import type { Database, Json } from "@/types/supabase";

export type WhiteLabelRow =
  Database["public"]["Tables"]["organization_white_label"]["Row"];
export type {
  WhiteLabelAssetRow,
  CustomDomainRow,
  PartnerAccountRow,
} from "@/lib/white-label/types";

export type ResolvedWhiteLabel = {
  config: WhiteLabelConfig;
  themeCss: string;
  themeVariables: Record<string, string>;
  assets: WhiteLabelAssetRow[];
  domains: CustomDomainRow[];
  partners: PartnerAccountRow[];
  status: string;
};

export async function getWhiteLabelConfig(
  organizationId: string,
  orgIdentity?: {
    name?: string | null;
    support_email?: string | null;
    logo_url?: string | null;
    terms_url?: string | null;
    privacy_policy_url?: string | null;
  } | null,
): Promise<ResolvedWhiteLabel> {
  const supabase = await createClient();
  let row: WhiteLabelRow | null = null;
  let assets: WhiteLabelAssetRow[] = [];
  let domains: CustomDomainRow[] = [];
  let partners: PartnerAccountRow[] = [];

  try {
    const { data, error } = await supabase
      .from("organization_white_label")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) {
      if (!error.message.includes("organization_white_label")) {
        throw new Error(error.message);
      }
    } else {
      row = data;
    }
  } catch {
    /* migration pending */
  }

  try {
    const { data } = await supabase
      .from("organization_white_label_assets")
      .select("*")
      .eq("organization_id", organizationId);
    assets = data ?? [];
  } catch {
    assets = [];
  }

  try {
    const { data } = await supabase
      .from("organization_custom_domains")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    domains = data ?? [];
  } catch {
    domains = [];
  }

  try {
    const { data } = await supabase
      .from("partner_accounts")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    partners = data ?? [];
  } catch {
    partners = [];
  }

  const config = mergeWhiteLabelConfig(
    (row?.config_json as Partial<WhiteLabelConfig> | null) ?? null,
    orgIdentity,
  );

  // Overlay asset URLs onto logos when set
  for (const asset of assets) {
    const url = asset.public_url || asset.data_url;
    if (url) {
      config.logos[asset.slot as keyof typeof config.logos] = url;
    }
  }

  const theme = buildThemeCss(config);
  return {
    config,
    themeCss: theme.cssText,
    themeVariables: theme.variables,
    assets,
    domains,
    partners,
    status: row?.status ?? "draft",
  };
}

/** Service-role read for Platform API (org id from API key — never cookies). */
export async function getWhiteLabelConfigForApi(
  organizationId: string,
): Promise<ResolvedWhiteLabel> {
  const { createServiceClient } = await import("@/lib/supabase/admin");
  const supabase = createServiceClient();

  const { data: row } = await supabase
    .from("organization_white_label")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const { data: assets } = await supabase
    .from("organization_white_label_assets")
    .select("*")
    .eq("organization_id", organizationId);

  const { data: domains } = await supabase
    .from("organization_custom_domains")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const { data: partners } = await supabase
    .from("partner_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const config = mergeWhiteLabelConfig(
    (row?.config_json as Partial<WhiteLabelConfig> | null) ?? null,
    null,
  );

  for (const asset of assets ?? []) {
    const url = asset.public_url || asset.data_url;
    if (url) {
      config.logos[asset.slot as keyof typeof config.logos] = url;
    }
  }

  const theme = buildThemeCss(config);
  return {
    config,
    themeCss: theme.cssText,
    themeVariables: theme.variables,
    assets: assets ?? [],
    domains: domains ?? [],
    partners: partners ?? [],
    status: row?.status ?? "draft",
  };
}

export async function ensureWhiteLabelRow(
  organizationId: string,
  userId: string,
  config: WhiteLabelConfig,
): Promise<void> {
  const supabase = await createClient();
  const theme = buildThemeCss(config);
  await supabase.from("organization_white_label").upsert(
    {
      organization_id: organizationId,
      config_json: config as unknown as Json,
      theme_cache_json: theme.variables as unknown as Json,
      status: "active",
      updated_by: userId,
    },
    { onConflict: "organization_id" },
  );
}
