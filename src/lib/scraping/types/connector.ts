/**
 * Connector Framework — shared type surface (fase 6).
 * Designed for 100+ connectors, cloud workers, and worldwide scale.
 * This phase: contracts + mock implementations only (no network I/O).
 */

export type ConnectorCode = string;

export type ConnectorCategory =
  | "maps"
  | "search"
  | "social"
  | "directory"
  | "reviews"
  | "jobs"
  | "registry"
  | "import"
  | "api"
  | "mock";

export type ConnectorMode = "mock" | "live";

export type ConnectorHealth =
  | "ready"
  | "degraded"
  | "disabled"
  | "unimplemented";

export type ConnectorProvider =
  | "google"
  | "microsoft"
  | "meta"
  | "apple"
  | "openstreetmap"
  | "yelp"
  | "trustpilot"
  | "opencorporates"
  | "linkedin"
  | "bytedance"
  | "yahoo"
  | "internal"
  | "other";

/**
 * Self-describing capabilities for UI + future worker routing.
 */
export type ConnectorCapabilities = {
  supportsCompanies: boolean;
  supportsContacts: boolean;
  supportsReviews: boolean;
  supportsWebsites: boolean;
  supportsPhoneNumbers: boolean;
  supportsEmail: boolean;
  supportsSocialMedia: boolean;
  supportsGeo: boolean;
  requiresProxy: boolean;
  requiresLogin: boolean;
  requiresApiKey: boolean;
  /** ISO 3166-1 alpha-2; empty = worldwide */
  supportedCountries: string[];
  /** ISO 639-1; empty = any */
  supportedLanguages: string[];
  maxRequestsPerMinute: number;
  defaultRateLimitPerMinute: number;
};

/**
 * Per-connector runtime configuration (scheduling / workers later).
 */
export type ConnectorConfig = {
  enabled: boolean;
  priority: number;
  maxConcurrency: number;
  timeoutMs: number;
  retryCount: number;
  rateLimitPerMinute: number;
  proxyEnabled: boolean;
};

export type ConnectorManifest = {
  code: ConnectorCode;
  name: string;
  provider: ConnectorProvider;
  category: ConnectorCategory;
  description: string;
  mode: ConnectorMode;
  health: ConnectorHealth;
  capabilities: ConnectorCapabilities;
  defaultConfig: ConnectorConfig;
};

/**
 * Uniform discovery result — every connector returns this shape.
 */
export type ConnectorResult = {
  companyName: string;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  sourceUrl: string;
  sourceCode: ConnectorCode;
  score?: number | null;
  category?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: string | null;
  reviewsCount?: number | null;
  reviewsRating?: number | null;
  raw?: Record<string, unknown>;
};

export type ConnectorJob = {
  organizationId: string;
  jobId: string;
  keywords: string[];
  countries: string[];
  cities: string[];
  regions: string[];
  languages: string[];
  industries: string[];
  searchPrompt?: string | null;
  pageIndex: number;
  pageSize: number;
};

export type ConnectorProgress = {
  percent: number;
  message: string;
  processed: number;
  total?: number;
};

export type ConnectorSearchPage = {
  sourceCode: ConnectorCode;
  items: ConnectorResult[];
  hasMore: boolean;
  progress?: ConnectorProgress;
  meta?: Record<string, unknown>;
};

export type ConnectorLogEvent =
  | "loaded"
  | "started"
  | "progress"
  | "finished"
  | "cancelled"
  | "failed";

export type ConnectorLogEntry = {
  connectorCode: ConnectorCode;
  event: ConnectorLogEvent;
  message: string;
  at: string;
  meta?: Record<string, unknown>;
};

/**
 * Primary connector contract. New connectors implement this — no edits to core.
 */
export interface Connector {
  readonly manifest: ConnectorManifest;
  searchPage(job: ConnectorJob): Promise<ConnectorSearchPage>;
  /** Optional health probe — mock returns ready. */
  healthCheck?(): Promise<ConnectorHealth>;
}

export interface ConnectorFactory {
  create(code: ConnectorCode): Connector | null;
}

export interface ConnectorRegistry {
  register(connector: Connector): void;
  list(): Connector[];
  listManifests(): ConnectorManifest[];
  get(code: ConnectorCode): Connector | null;
  getOrThrow(code: ConnectorCode): Connector;
  has(code: ConnectorCode): boolean;
}
