/**
 * Feature toggles + nav filtering for white-label modules.
 */

import type { NavItem } from "@/lib/constants";
import {
  FEATURE_NAV_PREFIXES,
  type WhiteLabelFeatureModule,
} from "@/lib/white-label/constants";
import type { WhiteLabelConfig } from "@/lib/white-label/types";

export function isFeatureEnabled(
  config: WhiteLabelConfig,
  module: WhiteLabelFeatureModule,
): boolean {
  if (config.navigation.hiddenModules.includes(module)) return false;
  return config.features[module] !== false;
}

export function filterNavItemsForWhiteLabel(
  items: readonly NavItem[],
  config: WhiteLabelConfig,
): NavItem[] {
  const disabledPrefixes = new Set<string>();
  for (const mod of Object.keys(config.features) as WhiteLabelFeatureModule[]) {
    if (!isFeatureEnabled(config, mod)) {
      for (const prefix of FEATURE_NAV_PREFIXES[mod] ?? []) {
        disabledPrefixes.add(prefix);
      }
    }
  }

  const filtered = items
    .filter((item) => {
      for (const prefix of disabledPrefixes) {
        if (item.href === prefix || item.href.startsWith(`${prefix}/`)) {
          return false;
        }
      }
      return true;
    })
    .map((item) => {
      if (!item.children?.length) return item;
      const children = item.children.filter((child) => {
        for (const prefix of disabledPrefixes) {
          if (child.href === prefix || child.href.startsWith(`${prefix}/`)) {
            return false;
          }
        }
        return true;
      });
      return { ...item, children };
    });

  const customs = config.navigation.customMenuItems
    .filter((c) => c.label.trim() && c.href.trim())
    .map(
      (c): NavItem => ({
        href: c.href,
        label: c.label,
        icon: c.icon || "Sparkles",
      }),
    );

  return [...filtered, ...customs];
}
