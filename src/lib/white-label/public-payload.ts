/**
 * Sanitize white-label config for API / public surfaces.
 * Never execute custom CSS/JS; omit JS body; omit CSS unless flagged.
 */

import type { WhiteLabelConfig } from "@/lib/white-label/types";

export type PublicWhiteLabelPayload = {
  applicationName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  supportWebsite: string;
  termsUrl: string;
  privacyUrl: string;
  logos: WhiteLabelConfig["logos"];
  colors: WhiteLabelConfig["colors"];
  typography: WhiteLabelConfig["typography"];
  login: WhiteLabelConfig["login"];
  email: {
    logoUrl: string;
    fromName: string;
    footerPoweredBy: string;
    hidePoweredBy: boolean;
  };
  features: WhiteLabelConfig["features"];
  navigation: WhiteLabelConfig["navigation"];
  themeMode: WhiteLabelConfig["themeMode"];
  customCssEnabled: boolean;
  customJsEnabled: boolean;
  customCss: string | null;
  themeCss: string;
  themeVariables: Record<string, string>;
};

export function toPublicWhiteLabelPayload(
  config: WhiteLabelConfig,
  theme: { cssText: string; variables: Record<string, string> },
): PublicWhiteLabelPayload {
  return {
    applicationName: config.applicationName,
    tagline: config.tagline,
    supportEmail: config.supportEmail,
    supportPhone: config.supportPhone,
    supportWebsite: config.supportWebsite,
    termsUrl: config.termsUrl,
    privacyUrl: config.privacyUrl,
    logos: config.logos,
    colors: config.colors,
    typography: config.typography,
    login: config.login,
    email: {
      logoUrl: config.email.logoUrl,
      fromName: config.email.fromName,
      footerPoweredBy: config.email.footerPoweredBy,
      hidePoweredBy: config.email.hidePoweredBy,
    },
    features: config.features,
    navigation: config.navigation,
    themeMode: config.themeMode,
    customCssEnabled: config.customCssEnabled,
    customJsEnabled: config.customJsEnabled,
    customCss: config.customCssEnabled ? config.customCss : null,
    themeCss: theme.cssText,
    themeVariables: theme.variables,
  };
}
