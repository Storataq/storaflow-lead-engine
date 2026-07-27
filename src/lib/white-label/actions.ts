"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { z } from "zod";

import {
  estimateDataUrlBytes,
  isHttpOrDataUrl,
  validateAssetMeta,
} from "@/lib/white-label/assets";
import {
  WHITE_LABEL_FEATURE_MODULES,
  WHITE_LABEL_LOGO_SLOTS,
  FONT_OPTIONS,
  FONT_SCALE_OPTIONS,
  THEME_MODES,
} from "@/lib/white-label/constants";
import {
  mergeWhiteLabelConfig,
  type WhiteLabelConfig,
} from "@/lib/white-label/types";
import { ensureWhiteLabelRow } from "@/lib/white-label/queries";
import { buildThemeCss } from "@/lib/white-label/theme-engine";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { createClient } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/ui/user-facing-error";
import type { Json } from "@/types/supabase";

export type WhiteLabelActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

function canManage(role: string) {
  return role === "owner" || role === "admin";
}

function revalidateAll() {
  revalidatePath("/settings/white-label");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/login");
}

const configSchema = z.object({
  applicationName: z.string().trim().min(1).max(120),
  tagline: z.string().max(240).optional(),
  supportEmail: z.string().max(200).optional(),
  supportPhone: z.string().max(60).optional(),
  supportWebsite: z.string().max(300).optional(),
  termsUrl: z.string().max(500).optional(),
  privacyUrl: z.string().max(500).optional(),
  logos: z.record(z.string(), z.string()).optional(),
  colors: z.record(z.string(), z.string()).optional(),
  typography: z
    .object({
      primaryFont: z.string(),
      headingFont: z.string(),
      bodyFont: z.string(),
      fontScale: z.enum(FONT_SCALE_OPTIONS),
    })
    .optional(),
  login: z
    .object({
      welcomeMessage: z.string().max(300),
      backgroundUrl: z.string().max(2000).optional(),
      heroImageUrl: z.string().max(2000).optional(),
      footerText: z.string().max(300).optional(),
      supportLinks: z
        .array(z.object({ label: z.string(), href: z.string() }))
        .optional(),
    })
    .optional(),
  email: z
    .object({
      logoUrl: z.string().max(2000).optional(),
      fromName: z.string().max(120).optional(),
      footerPoweredBy: z.string().max(200).optional(),
      hidePoweredBy: z.boolean().optional(),
    })
    .optional(),
  navigation: z
    .object({
      hiddenModules: z.array(z.enum(WHITE_LABEL_FEATURE_MODULES)).optional(),
      customMenuItems: z
        .array(
          z.object({
            label: z.string(),
            href: z.string(),
            icon: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  features: z.record(z.string(), z.boolean()).optional(),
  themeMode: z.enum(THEME_MODES).optional(),
  customCssEnabled: z.boolean().optional(),
  customJsEnabled: z.boolean().optional(),
  customCss: z.string().max(20_000).optional(),
  customJs: z.string().max(20_000).optional(),
});

export async function saveWhiteLabelConfigAction(
  raw: unknown,
): Promise<WhiteLabelActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return {
        success: false,
        message: "Only owners/admins can edit White Label settings.",
      };
    }

    const parsed = configSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, message: "Invalid white label configuration." };
    }

    const config = mergeWhiteLabelConfig(
      parsed.data as Partial<WhiteLabelConfig>,
      context.organization,
    );

    // Validate logo URLs when present
    for (const [slot, url] of Object.entries(config.logos)) {
      if (!url) continue;
      if (!isHttpOrDataUrl(url)) {
        return {
          success: false,
          message: `Invalid URL for ${slot}. Use https:// or a data:image URL.`,
        };
      }
      if (url.startsWith("data:") && estimateDataUrlBytes(url) > 512 * 1024) {
        return {
          success: false,
          message: `Asset for ${slot} exceeds 512 KB.`,
        };
      }
    }

    if (
      config.typography.primaryFont &&
      !(FONT_OPTIONS as readonly string[]).includes(config.typography.primaryFont)
    ) {
      // Allow unknown fonts as custom stacks later; keep listed ones preferred
    }

    await ensureWhiteLabelRow(
      context.organization.id,
      context.membership.user_id,
      config,
    );

    // Sync core org identity fields when provided
    const supabase = await createClient();
    await supabase
      .from("organizations")
      .update({
        support_email: config.supportEmail || null,
        terms_url: config.termsUrl || null,
        privacy_policy_url: config.privacyUrl || null,
        logo_url:
          config.logos.primary_logo ||
          config.logos.sidebar_logo ||
          context.organization.logo_url,
      })
      .eq("id", context.organization.id);

    revalidateAll();
    return { success: true, message: "White Label settings saved." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save White Label settings."),
    };
  }
}

export async function saveWhiteLabelAssetAction(input: {
  slot: string;
  contentType: string;
  publicUrl?: string | null;
  dataUrl?: string | null;
  widthPx?: number | null;
  heightPx?: number | null;
}): Promise<WhiteLabelActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }
    if (
      !WHITE_LABEL_LOGO_SLOTS.includes(
        input.slot as (typeof WHITE_LABEL_LOGO_SLOTS)[number],
      )
    ) {
      return { success: false, message: "Unknown asset slot." };
    }

    const byteSize = input.dataUrl
      ? estimateDataUrlBytes(input.dataUrl)
      : 1024;
    const validated = validateAssetMeta({
      contentType: input.contentType,
      byteSize,
      widthPx: input.widthPx,
      heightPx: input.heightPx,
      slot: input.slot as (typeof WHITE_LABEL_LOGO_SLOTS)[number],
    });
    if (!validated.ok) return { success: false, message: validated.message };

    const url = input.publicUrl || input.dataUrl;
    if (!url || !isHttpOrDataUrl(url)) {
      return { success: false, message: "Provide a valid asset URL." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_white_label_assets")
      .upsert(
        {
          organization_id: context.organization.id,
          slot: input.slot,
          content_type: validated.contentType,
          byte_size: validated.byteSize,
          width_px: validated.widthPx ?? null,
          height_px: validated.heightPx ?? null,
          public_url: input.publicUrl ?? null,
          data_url: input.dataUrl ?? null,
          created_by: context.membership.user_id,
        },
        { onConflict: "organization_id,slot" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Mirror into config logos
    const { data: wl } = await supabase
      .from("organization_white_label")
      .select("config_json")
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    const merged = mergeWhiteLabelConfig(
      (wl?.config_json as Partial<WhiteLabelConfig>) ?? null,
      context.organization,
    );
    merged.logos[input.slot as keyof typeof merged.logos] = url;
    const theme = buildThemeCss(merged);
    await supabase.from("organization_white_label").upsert(
      {
        organization_id: context.organization.id,
        config_json: merged as unknown as Json,
        theme_cache_json: theme.variables as unknown as Json,
        status: "active",
        updated_by: context.membership.user_id,
      },
      { onConflict: "organization_id" },
    );

    revalidateAll();
    return { success: true, message: "Asset saved.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not save asset."),
    };
  }
}

export async function addCustomDomainAction(input: {
  hostname: string;
  isPrimary?: boolean;
}): Promise<WhiteLabelActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }
    const hostname = input.hostname.trim().toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(hostname)) {
      return { success: false, message: "Invalid hostname." };
    }
    const token = `sf-dns-${randomBytes(12).toString("hex")}`;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_custom_domains")
      .insert({
        organization_id: context.organization.id,
        hostname,
        is_primary: input.isPrimary ?? false,
        dns_validation_token: token,
        status: "pending_dns",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    revalidateAll();
    return {
      success: true,
      message: `Domain added. Create TXT record: storaflow-verify=${token}`,
      id: data.id,
    };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not add domain."),
    };
  }
}

export async function removeCustomDomainAction(input: {
  domainId: string;
}): Promise<WhiteLabelActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("organization_custom_domains")
      .delete()
      .eq("organization_id", context.organization.id)
      .eq("id", input.domainId);
    if (error) throw new Error(error.message);
    revalidateAll();
    return { success: true, message: "Domain removed." };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not remove domain."),
    };
  }
}

export async function createPartnerAccountAction(input: {
  code: string;
  name: string;
}): Promise<WhiteLabelActionResult> {
  try {
    const context = await getActiveOrganization();
    if (!context) return { success: false, message: "Not authenticated." };
    if (!canManage(context.membership.role)) {
      return { success: false, message: "Not permitted." };
    }
    const code = input.code.trim().toLowerCase().replace(/\s+/g, "-");
    if (!code) return { success: false, message: "Partner code required." };
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("partner_accounts")
      .insert({
        organization_id: context.organization.id,
        code,
        name: input.name.trim(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    revalidateAll();
    return { success: true, message: "Partner account created.", id: data.id };
  } catch (error) {
    return {
      success: false,
      message: toUserFacingError(error, "Could not create partner."),
    };
  }
}
