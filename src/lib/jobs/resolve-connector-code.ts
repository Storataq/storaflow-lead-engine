/**
 * Resolves which foundation connector code to use for a scrape job.
 * Prefers google_maps (MVP) when selected or when sources are empty.
 */

import { defaultConnectorFactory } from "@/lib/scraping/connectors/factory";
import { GOOGLE_MAPS_CONNECTOR_CODE } from "@/lib/scraping/connectors/google-maps";
import { DEFAULT_CONNECTOR_CODE } from "@/lib/jobs/constants";

export function resolveJobConnectorCode(
  sources: string[] | null | undefined,
): string {
  const list = sources?.filter(Boolean) ?? [];

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

  // MVP default: first working connector is Google Maps.
  return GOOGLE_MAPS_CONNECTOR_CODE;
}
