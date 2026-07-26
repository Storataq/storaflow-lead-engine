/**
 * Default capability / config helpers for mock connectors.
 */

import type {
  ConnectorCapabilities,
  ConnectorConfig,
} from "@/lib/scraping/types/connector";

export function defaultCapabilities(
  overrides: Partial<ConnectorCapabilities> = {},
): ConnectorCapabilities {
  return {
    supportsCompanies: true,
    supportsContacts: true,
    supportsReviews: false,
    supportsWebsites: true,
    supportsPhoneNumbers: true,
    supportsEmail: true,
    supportsSocialMedia: false,
    supportsGeo: false,
    requiresProxy: false,
    requiresLogin: false,
    requiresApiKey: false,
    supportedCountries: [],
    supportedLanguages: [],
    maxRequestsPerMinute: 60,
    defaultRateLimitPerMinute: 30,
    ...overrides,
  };
}

export function defaultConfig(
  overrides: Partial<ConnectorConfig> = {},
): ConnectorConfig {
  return {
    enabled: true,
    priority: 50,
    maxConcurrency: 2,
    timeoutMs: 30_000,
    retryCount: 2,
    rateLimitPerMinute: 30,
    proxyEnabled: false,
    ...overrides,
  };
}
