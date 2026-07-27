/**
 * Theme engine — maps white-label colors/fonts to CSS custom properties.
 * Supports light/dark/auto and future seasonal themes via theme variants.
 */

import type { WhiteLabelConfig } from "@/lib/white-label/types";
import type { ThemeMode } from "@/lib/white-label/constants";

/** Map brand color keys → CSS variables used by the design system. */
const COLOR_VAR_MAP: Record<string, string[]> = {
  primary: ["--primary", "--sidebar-primary", "--ring"],
  secondary: ["--secondary"],
  accent: ["--accent"],
  danger: ["--destructive"],
  background: ["--background"],
  surface: ["--card", "--popover", "--sidebar"],
  border: ["--border", "--input", "--sidebar-border"],
  text: ["--foreground", "--card-foreground", "--sidebar-foreground"],
  link: ["--primary"],
};

const FONT_STACK: Record<string, string> = {
  Geist: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
  Inter: "Inter, ui-sans-serif, system-ui, sans-serif",
  "System UI": "system-ui, -apple-system, Segoe UI, sans-serif",
  Georgia: "Georgia, 'Times New Roman', serif",
  "Roboto Slab": "'Roboto Slab', Georgia, serif",
  "Source Sans 3": "'Source Sans 3', ui-sans-serif, system-ui, sans-serif",
};

const FONT_SCALE: Record<string, string> = {
  sm: "0.925",
  md: "1",
  lg: "1.075",
};

export type ThemeCssBundle = {
  variables: Record<string, string>;
  cssText: string;
  mode: ThemeMode;
};

function isCssColor(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return true;
  if (/^oklch\(/i.test(v) || /^rgb\(/i.test(v) || /^hsl\(/i.test(v)) return true;
  return false;
}

export function buildThemeCss(config: WhiteLabelConfig): ThemeCssBundle {
  const variables: Record<string, string> = {};

  for (const [key, value] of Object.entries(config.colors)) {
    if (!value || !isCssColor(value)) continue;
    const targets = COLOR_VAR_MAP[key] ?? [];
    for (const cssVar of targets) {
      variables[cssVar] = value.trim();
    }
  }

  const primaryFont =
    FONT_STACK[config.typography.primaryFont] ?? FONT_STACK.Geist;
  const headingFont =
    FONT_STACK[config.typography.headingFont] ?? primaryFont;
  const bodyFont = FONT_STACK[config.typography.bodyFont] ?? primaryFont;
  variables["--font-sans"] = bodyFont;
  variables["--font-heading"] = headingFont;
  variables["--wl-font-scale"] =
    FONT_SCALE[config.typography.fontScale] ?? "1";

  if (config.colors.primary && isCssColor(config.colors.primary)) {
    variables["--wl-brand-primary"] = config.colors.primary.trim();
  }

  const decls = Object.entries(variables)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");

  const cssText = decls
    ? `:root { ${decls} } .dark { ${decls} }`
    : "";

  return {
    variables,
    cssText,
    mode: config.themeMode,
  };
}

/** Future seasonal / named themes registry. */
export const FUTURE_THEME_VARIANTS = [
  "default",
  "seasonal_spring",
  "seasonal_winter",
  "high_contrast",
] as const;

export function resolveThemeModeClass(
  mode: ThemeMode,
  prefersDark?: boolean,
): "light" | "dark" | null {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  if (prefersDark == null) return null;
  return prefersDark ? "dark" : "light";
}
