/**
 * Registers all default mock connectors once at module load.
 */

import {
  BingConnector,
  CompanyWebsiteConnector,
  FacebookConnector,
  GoogleBusinessProfileConnector,
  GoogleMapsConnector,
  GoogleSearchConnector,
  GoudenGidsConnector,
  InstagramConnector,
  LinkedInConnector,
  MockConnector,
  OpenCorporatesConnector,
  OpenStreetMapConnector,
  TikTokConnector,
  TrustpilotConnector,
  YellowPagesConnector,
  YelpConnector,
} from "@/lib/scraping/connectors/modules";
import { registerConnector } from "@/lib/scraping/registry/store";

let registered = false;

export function registerDefaultConnectors(): void {
  if (registered) return;

  const instances = [
    new MockConnector(),
    new GoogleMapsConnector(),
    new GoogleSearchConnector(),
    new GoogleBusinessProfileConnector(),
    new OpenStreetMapConnector(),
    new BingConnector(),
    new LinkedInConnector(),
    new FacebookConnector(),
    new InstagramConnector(),
    new TikTokConnector(),
    new YellowPagesConnector(),
    new YelpConnector(),
    new TrustpilotConnector(),
    new OpenCorporatesConnector(),
    new GoudenGidsConnector(),
    new CompanyWebsiteConnector(),
  ];

  for (const connector of instances) {
    registerConnector(connector);
  }

  registered = true;
}

// Auto-register for app imports
registerDefaultConnectors();
