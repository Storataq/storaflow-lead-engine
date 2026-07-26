/**
 * Google Maps connector capability description (foundation).
 */

import type { ConnectorCapabilities } from "@/lib/scraping/connectors/capabilities";

/**
 * Rich capability profile for UI / routing docs.
 * Maps onto the shared ConnectorCapabilities for the Connector interface.
 */
export type GoogleMapsCapabilityProfile = {
  name: string;
  provider: string;
  supportedCountries: readonly string[];
  supportedLanguages: readonly string[];
  supportsWebsites: boolean;
  supportsPhoneNumbers: boolean;
  supportsReviews: boolean;
  supportsOpeningHours: boolean;
  supportsCoordinates: boolean;
  requiresLogin: boolean;
  requiresProxy: boolean;
  requiresBrowser: boolean;
  requiresApi: boolean;
};

export const GOOGLE_MAPS_CAPABILITY_PROFILE: GoogleMapsCapabilityProfile = {
  name: "Google Maps",
  provider: "google",
  supportedCountries: [], // worldwide
  supportedLanguages: ["en", "nl", "de", "fr", "es", "it", "pt"],
  supportsWebsites: true,
  supportsPhoneNumbers: true,
  supportsReviews: true,
  supportsOpeningHours: true,
  supportsCoordinates: true,
  requiresLogin: false,
  requiresProxy: false,
  requiresBrowser: false,
  requiresApi: false, // mock foundation — Places API later
};

/** Shared Connector interface capabilities. */
export const GOOGLE_MAPS_CAPABILITIES: ConnectorCapabilities = {
  supportsSearch: true,
  supportsCompanies: true,
  supportsContacts: true,
  supportsWebsites: true,
  supportsPhoneNumbers: true,
  supportsEmail: false,
  supportedCountries: [],
  requiresApiKey: false,
  requiresProxy: false,
  requiresLogin: false,
};
