/**
 * Planned connector catalog (manifests only).
 * Implementations land in later phases — except the mock connector.
 */

import type { ConnectorManifest } from "@/lib/scraping/connectors/types";

function planned(
  code: string,
  displayName: string,
  description: string,
  regions: string[] = [],
): ConnectorManifest {
  return {
    code,
    displayName,
    description,
    capabilities: ["search_discovery"],
    regions,
    supportsProxy: true,
    supportsRateLimit: true,
    supportsRetry: true,
    health: "unimplemented",
  };
}

/**
 * Extensible worldwide source catalog.
 * Codes align with search_queries.sources where applicable.
 */
export const PLANNED_CONNECTOR_MANIFESTS: ConnectorManifest[] = [
  planned("google_maps", "Google Maps", "Places / Maps discovery", []),
  planned("google_search", "Google Search", "Web search discovery", []),
  planned(
    "google_business_profile",
    "Google Business Profile",
    "GBP listings",
    [],
  ),
  planned("bing_places", "Bing Places", "Bing local places", []),
  planned("linkedin", "LinkedIn", "Company pages (public)", []),
  planned("facebook", "Facebook", "Business pages", []),
  planned("instagram", "Instagram", "Business profiles", []),
  planned("yelp", "Yelp", "Local business directory", ["US", "CA", "EU"]),
  planned("yellow_pages", "Yellow Pages", "Regional yellow pages", []),
  planned("gouden_gids", "Gouden Gids", "NL business directory", ["NL", "BE"]),
  planned("trustpilot", "Trustpilot", "Review / company profiles", []),
  planned(
    "openstreetmap",
    "OpenStreetMap",
    "Open geo business points",
    [],
  ),
  planned(
    "company_website",
    "Company Websites",
    "Direct website crawl enrichment",
    [],
  ),
  planned(
    "business_registers",
    "Open bedrijfsregisters",
    "Chamber / open company registers",
    [],
  ),
  planned(
    "custom_api",
    "Eigen API connectors",
    "Customer-provided APIs",
    [],
  ),
  planned("directories", "Business directories", "Generic directories", []),
  planned("other", "Other", "Future connectors", []),
];
