/**
 * Resolves which foundation connector code to use for a scrape job.
 * Prefers OpenStreetMap (live) when selected; otherwise Google Maps mock / Mock.
 */

import { DEFAULT_CONNECTOR_CODE } from "@/lib/jobs/constants";
import { defaultConnectorFactory } from "@/lib/scraping/connectors/factory";
import { GOOGLE_MAPS_CONNECTOR_CODE } from "@/lib/scraping/connectors/google-maps";
import { OPENSTREETMAP_CONNECTOR_CODE } from "@/lib/scraping/connectors/openstreetmap";

export function resolveJobConnectorCode(
  sources: string[] | null | undefined,
): string {
  const list = sources?.filter(Boolean) ?? [];

  if (list.includes(OPENSTREETMAP_CONNECTOR_CODE)) {
    return OPENSTREETMAP_CONNECTOR_CODE;
  }

  if (list.includes(GOOGLE_MAPS_CONNECTOR_CODE)) {
    return GOOGLE_MAPS_CONNECTOR_CODE;
  }

  if (list.includes(DEFAULT_CONNECTOR_CODE)) {
    return DEFAULT_CONNECTOR_CODE;
  }

  for (const code of list) {
    if (defaultConnectorFactory.tryCreate(code)) {
      return code;
    }
  }

  // Phase 20B default: first live connector (Nominatim).
  if (defaultConnectorFactory.tryCreate(OPENSTREETMAP_CONNECTOR_CODE)) {
    return OPENSTREETMAP_CONNECTOR_CODE;
  }

  return GOOGLE_MAPS_CONNECTOR_CODE;
}
