/**
 * Concrete mock connectors (fase 6).
 * Each file is a module; register-defaults imports them all.
 */

import { BaseMockConnector } from "@/lib/scraping/core/base-mock-connector";
import {
  defaultCapabilities,
  defaultConfig,
} from "@/lib/scraping/utils/defaults";
import type { ConnectorManifest } from "@/lib/scraping/types/connector";

function defineMock(
  manifest: ConnectorManifest,
): new () => BaseMockConnector {
  return class extends BaseMockConnector {
    readonly manifest = manifest;
  };
}

export const MockConnector = defineMock({
  code: "mock",
  name: "Mock Connector",
  provider: "internal",
  category: "mock",
  description: "Deterministic in-process discovery for tests. No external I/O.",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities(),
  defaultConfig: defaultConfig({ priority: 100 }),
});

export const GoogleMapsConnector = defineMock({
  code: "google_maps",
  name: "Google Maps",
  provider: "google",
  category: "maps",
  description: "Places / Maps discovery (mock). Live adapter later.",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({
    supportsGeo: true,
    supportsReviews: true,
    requiresApiKey: true,
  }),
  defaultConfig: defaultConfig({ rateLimitPerMinute: 20, proxyEnabled: true }),
});

export const GoogleSearchConnector = defineMock({
  code: "google_search",
  name: "Google Search",
  provider: "google",
  category: "search",
  description: "Web search discovery (mock).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({ requiresApiKey: true }),
  defaultConfig: defaultConfig({ rateLimitPerMinute: 15, proxyEnabled: true }),
});

export const GoogleBusinessProfileConnector = defineMock({
  code: "google_business_profile",
  name: "Google Business Profile",
  provider: "google",
  category: "directory",
  description: "GBP listings (mock).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({
    supportsReviews: true,
    supportsPhoneNumbers: true,
    requiresApiKey: true,
  }),
  defaultConfig: defaultConfig(),
});

export const OpenStreetMapConnector = defineMock({
  code: "openstreetmap",
  name: "OpenStreetMap",
  provider: "openstreetmap",
  category: "maps",
  description: "Open geo business points (mock).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({ supportsGeo: true }),
  defaultConfig: defaultConfig({ rateLimitPerMinute: 60 }),
});

export const BingConnector = defineMock({
  code: "bing_places",
  name: "Bing Places",
  provider: "microsoft",
  category: "maps",
  description: "Bing local places (mock).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({ supportsGeo: true, requiresApiKey: true }),
  defaultConfig: defaultConfig(),
});

export const LinkedInConnector = defineMock({
  code: "linkedin",
  name: "LinkedIn",
  provider: "linkedin",
  category: "social",
  description: "Company pages — public signals only (mock).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({
    supportsSocialMedia: true,
    supportsContacts: true,
    requiresLogin: true,
    requiresProxy: true,
  }),
  defaultConfig: defaultConfig({
    proxyEnabled: true,
    rateLimitPerMinute: 10,
    maxConcurrency: 1,
  }),
});

export const FacebookConnector = defineMock({
  code: "facebook",
  name: "Facebook",
  provider: "meta",
  category: "social",
  description: "Business pages (mock).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({
    supportsSocialMedia: true,
    requiresLogin: true,
    requiresProxy: true,
  }),
  defaultConfig: defaultConfig({ proxyEnabled: true, rateLimitPerMinute: 10 }),
});

export const InstagramConnector = defineMock({
  code: "instagram",
  name: "Instagram",
  provider: "meta",
  category: "social",
  description: "Business profiles (mock).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({
    supportsSocialMedia: true,
    requiresLogin: true,
    requiresProxy: true,
  }),
  defaultConfig: defaultConfig({ proxyEnabled: true, rateLimitPerMinute: 8 }),
});

export const TikTokConnector = defineMock({
  code: "tiktok",
  name: "TikTok",
  provider: "bytedance",
  category: "social",
  description: "Business / creator pages (mock).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({
    supportsSocialMedia: true,
    requiresProxy: true,
  }),
  defaultConfig: defaultConfig({ proxyEnabled: true }),
});

export const YellowPagesConnector = defineMock({
  code: "yellow_pages",
  name: "Yellow Pages",
  provider: "other",
  category: "directory",
  description: "Regional yellow pages (mock).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({
    supportsPhoneNumbers: true,
    supportedCountries: ["US", "CA", "AU"],
  }),
  defaultConfig: defaultConfig(),
});

export const YelpConnector = defineMock({
  code: "yelp",
  name: "Yelp",
  provider: "yelp",
  category: "reviews",
  description: "Local business directory + reviews (mock).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({
    supportsReviews: true,
    supportsGeo: true,
    requiresApiKey: true,
    supportedCountries: ["US", "CA", "GB", "DE", "FR", "NL"],
  }),
  defaultConfig: defaultConfig({ rateLimitPerMinute: 20 }),
});

export const TrustpilotConnector = defineMock({
  code: "trustpilot",
  name: "Trustpilot",
  provider: "trustpilot",
  category: "reviews",
  description: "Review / company profiles (mock).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({
    supportsReviews: true,
    supportsWebsites: true,
  }),
  defaultConfig: defaultConfig(),
});

export const OpenCorporatesConnector = defineMock({
  code: "opencorporates",
  name: "OpenCorporates",
  provider: "opencorporates",
  category: "registry",
  description: "Open company registers (mock).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({
    supportsContacts: false,
    requiresApiKey: true,
  }),
  defaultConfig: defaultConfig({ rateLimitPerMinute: 40 }),
});

export const GoudenGidsConnector = defineMock({
  code: "gouden_gids",
  name: "Gouden Gids",
  provider: "other",
  category: "directory",
  description: "NL/BE business directory (mock).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({
    supportedCountries: ["NL", "BE"],
    supportedLanguages: ["nl", "fr", "en"],
  }),
  defaultConfig: defaultConfig(),
});

export const CompanyWebsiteConnector = defineMock({
  code: "company_website",
  name: "Company Websites",
  provider: "internal",
  category: "api",
  description: "Direct website crawl enrichment (mock — no crawl yet).",
  mode: "mock",
  health: "ready",
  capabilities: defaultCapabilities({
    supportsEmail: true,
    supportsPhoneNumbers: true,
    supportsWebsites: true,
  }),
  defaultConfig: defaultConfig({ maxConcurrency: 4 }),
});
