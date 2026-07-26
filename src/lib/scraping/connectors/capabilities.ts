/**
 * Self-describing connector capabilities for routing and UI.
 */

export type ConnectorCapabilities = {
  supportsSearch: boolean;
  supportsCompanies: boolean;
  supportsContacts: boolean;
  supportsWebsites: boolean;
  supportsPhoneNumbers: boolean;
  supportsEmail: boolean;
  /** Empty = worldwide */
  supportedCountries: readonly string[];
  requiresApiKey: boolean;
  requiresProxy: boolean;
  requiresLogin: boolean;
};

export const MOCK_CAPABILITIES: ConnectorCapabilities = {
  supportsSearch: true,
  supportsCompanies: true,
  supportsContacts: true,
  supportsWebsites: true,
  supportsPhoneNumbers: true,
  supportsEmail: true,
  supportedCountries: [],
  requiresApiKey: false,
  requiresProxy: false,
  requiresLogin: false,
};
