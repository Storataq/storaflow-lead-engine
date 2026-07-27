/**
 * Phase 26C — White Label public surface (client-safe).
 */

export {
  WHITE_LABEL_LOGO_SLOTS,
  WHITE_LABEL_LOGO_SLOT_LABELS,
  WHITE_LABEL_COLOR_KEYS,
  WHITE_LABEL_COLOR_LABELS,
  WHITE_LABEL_FEATURE_MODULES,
  WHITE_LABEL_FEATURE_LABELS,
  FONT_OPTIONS,
  FONT_SCALE_OPTIONS,
  THEME_MODES,
  THEME_MODE_LABELS,
  DOMAIN_STATUS_LABELS,
} from "@/lib/white-label/constants";

export {
  defaultWhiteLabelConfig,
  mergeWhiteLabelConfig,
} from "@/lib/white-label/types";

export type { WhiteLabelConfig } from "@/lib/white-label/types";

export { buildThemeCss, resolveThemeModeClass } from "@/lib/white-label/theme-engine";
export {
  filterNavItemsForWhiteLabel,
  isFeatureEnabled,
} from "@/lib/white-label/features";
export {
  validateAssetMeta,
  isHttpOrDataUrl,
} from "@/lib/white-label/assets";

export { toPublicWhiteLabelPayload } from "@/lib/white-label/public-payload";
export type { PublicWhiteLabelPayload } from "@/lib/white-label/public-payload";