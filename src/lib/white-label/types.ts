import type { Database } from "@/types/supabase";
import type {
  FontScale,
  ThemeMode,
  WhiteLabelColorKey,
  WhiteLabelFeatureModule,
  WhiteLabelLogoSlot,
} from "@/lib/white-label/constants";
import {
  WHITE_LABEL_COLOR_KEYS,
  WHITE_LABEL_FEATURE_MODULES,
  WHITE_LABEL_LOGO_SLOTS,
} from "@/lib/white-label/constants";
import { APP_NAME, APP_TAGLINE, APP_POWERED_BY } from "@/lib/constants";

export type CustomDomainRow =
  Database["public"]["Tables"]["organization_custom_domains"]["Row"];
export type PartnerAccountRow =
  Database["public"]["Tables"]["partner_accounts"]["Row"];
export type WhiteLabelAssetRow =
  Database["public"]["Tables"]["organization_white_label_assets"]["Row"];

export type WhiteLabelLogos = Partial<Record<WhiteLabelLogoSlot, string>>;
export type WhiteLabelColors = Partial<Record<WhiteLabelColorKey, string>>;
export type WhiteLabelFeatures = Record<WhiteLabelFeatureModule, boolean>;

export type WhiteLabelConfig = {
  applicationName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  supportWebsite: string;
  termsUrl: string;
  privacyUrl: string;
  logos: WhiteLabelLogos;
  colors: WhiteLabelColors;
  typography: {
    primaryFont: string;
    headingFont: string;
    bodyFont: string;
    fontScale: FontScale;
  };
  login: {
    welcomeMessage: string;
    backgroundUrl: string;
    heroImageUrl: string;
    footerText: string;
    supportLinks: Array<{ label: string; href: string }>;
  };
  email: {
    logoUrl: string;
    fromName: string;
    footerPoweredBy: string;
    hidePoweredBy: boolean;
  };
  navigation: {
    hiddenModules: WhiteLabelFeatureModule[];
    customMenuItems: Array<{ label: string; href: string; icon?: string }>;
  };
  features: WhiteLabelFeatures;
  themeMode: ThemeMode;
  customCssEnabled: boolean;
  customJsEnabled: boolean;
  customCss: string;
  customJs: string;
};

export function defaultFeatures(): WhiteLabelFeatures {
  return Object.fromEntries(
    WHITE_LABEL_FEATURE_MODULES.map((m) => [m, true]),
  ) as WhiteLabelFeatures;
}

export function defaultWhiteLabelConfig(
  org?: {
    name?: string | null;
    support_email?: string | null;
    logo_url?: string | null;
    terms_url?: string | null;
    privacy_policy_url?: string | null;
  } | null,
): WhiteLabelConfig {
  const logos: WhiteLabelLogos = {};
  if (org?.logo_url) {
    for (const slot of WHITE_LABEL_LOGO_SLOTS) {
      if (
        slot === "primary_logo" ||
        slot === "sidebar_logo" ||
        slot === "email_logo" ||
        slot === "login_logo"
      ) {
        logos[slot] = org.logo_url;
      }
    }
  }

  return {
    applicationName: org?.name?.trim() || APP_NAME,
    tagline: APP_TAGLINE,
    supportEmail: org?.support_email?.trim() || "",
    supportPhone: "",
    supportWebsite: "",
    termsUrl: org?.terms_url?.trim() || "",
    privacyUrl: org?.privacy_policy_url?.trim() || "",
    logos,
    colors: Object.fromEntries(
      WHITE_LABEL_COLOR_KEYS.map((k) => [k, ""]),
    ) as WhiteLabelColors,
    typography: {
      primaryFont: "Geist",
      headingFont: "Geist",
      bodyFont: "Geist",
      fontScale: "md",
    },
    login: {
      welcomeMessage: `Welcome to ${org?.name?.trim() || APP_NAME}`,
      backgroundUrl: "",
      heroImageUrl: "",
      footerText: "",
      supportLinks: [],
    },
    email: {
      logoUrl: org?.logo_url?.trim() || "",
      fromName: org?.name?.trim() || APP_NAME,
      footerPoweredBy: APP_POWERED_BY,
      hidePoweredBy: false,
    },
    navigation: {
      hiddenModules: [],
      customMenuItems: [],
    },
    features: defaultFeatures(),
    themeMode: "system",
    customCssEnabled: false,
    customJsEnabled: false,
    customCss: "",
    customJs: "",
  };
}

export function mergeWhiteLabelConfig(
  partial: Partial<WhiteLabelConfig> | null | undefined,
  org?: Parameters<typeof defaultWhiteLabelConfig>[0],
): WhiteLabelConfig {
  const base = defaultWhiteLabelConfig(org);
  if (!partial || typeof partial !== "object") return base;
  return {
    ...base,
    ...partial,
    logos: { ...base.logos, ...(partial.logos ?? {}) },
    colors: { ...base.colors, ...(partial.colors ?? {}) },
    typography: { ...base.typography, ...(partial.typography ?? {}) },
    login: {
      ...base.login,
      ...(partial.login ?? {}),
      supportLinks:
        partial.login?.supportLinks ?? base.login.supportLinks,
    },
    email: { ...base.email, ...(partial.email ?? {}) },
    navigation: {
      ...base.navigation,
      ...(partial.navigation ?? {}),
      hiddenModules:
        partial.navigation?.hiddenModules ?? base.navigation.hiddenModules,
      customMenuItems:
        partial.navigation?.customMenuItems ??
        base.navigation.customMenuItems,
    },
    features: { ...base.features, ...(partial.features ?? {}) },
  };
}
