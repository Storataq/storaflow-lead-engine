/**
 * Mock catalog for Company Intelligence Sources Center.
 * Replace with live connector registry later — UI consumes IntelligenceSourceCard only.
 */

import type {
  IntelligenceSourceCard,
  ConnectorPipelineStep,
} from "@/lib/company-intelligence/connector-interfaces";

function pipeline(
  overrides: Partial<Record<ConnectorPipelineStep["id"], ConnectorPipelineStep["state"]>> = {},
): ConnectorPipelineStep[] {
  const defaults: ConnectorPipelineStep[] = [
    { id: "search", label: "Search", state: "mock" },
    { id: "fetch", label: "Fetch", state: "mock" },
    { id: "normalize", label: "Normalize", state: "waiting" },
    { id: "validate", label: "Validate", state: "waiting" },
    { id: "store", label: "Store", state: "future" },
    { id: "enrich", label: "Enrich", state: "future" },
    { id: "crm", label: "CRM", state: "future" },
  ];
  return defaults.map((step) => ({
    ...step,
    state: overrides[step.id] ?? step.state,
  }));
}

export const INTELLIGENCE_SOURCE_CARDS: IntelligenceSourceCard[] = [
  {
    id: "google-maps",
    name: "Google Maps",
    description:
      "Lokale bedrijfsvermeldingen, adressen, reviews en coördinaten (mock).",
    connectorType: "maps",
    connectorName: "google-maps-connector",
    version: "0.1.0-mock",
    badges: ["mock_source", "coming_soon", "healthy"],
    confidence: 78,
    coverage: 72,
    freshness: 65,
    lastSyncAt: "2026-07-26T10:15:00.000Z",
    queueStatus: "idle",
    estimatedRecords: 12500,
    futureAvailability: "Q4 2026 — live Google Places connector",
    averageRuntimeMs: 2400,
    averageConfidence: 76,
    health: "healthy",
    healthMessage: "Mock endpoint stabiel — geen live API.",
    fields: [
      "Company Name",
      "Address",
      "Phone",
      "Website",
      "Categories",
      "Reviews",
      "Rating",
      "Coordinates",
      "Opening Hours",
    ],
    pipeline: pipeline({
      search: "completed",
      fetch: "mock",
      normalize: "mock",
      validate: "waiting",
      store: "future",
      enrich: "future",
      crm: "future",
    }),
    futureNotes:
      "Vervangt mock hits door Places API / Maps connector zonder UI-wijzigingen.",
  },
  {
    id: "google-search",
    name: "Google Search",
    description:
      "SERP-signalen voor website, beschrijving en indexering (mock).",
    connectorType: "search",
    connectorName: "google-search-connector",
    version: "0.1.0-mock",
    badges: ["mock_source", "coming_soon"],
    confidence: 64,
    coverage: 58,
    freshness: 70,
    lastSyncAt: "2026-07-25T18:40:00.000Z",
    queueStatus: "completed",
    estimatedRecords: 8400,
    futureAvailability: "Later — Custom Search / SERP provider",
    averageRuntimeMs: 3100,
    averageConfidence: 62,
    health: "warning",
    healthMessage: "Mock only — rate limits nog niet geconfigureerd.",
    fields: [
      "Company Name",
      "Website",
      "Description",
      "Search Rank",
      "Indexed Pages",
    ],
    pipeline: pipeline({
      search: "mock",
      fetch: "waiting",
      normalize: "waiting",
      validate: "future",
      store: "future",
      enrich: "future",
      crm: "future",
    }),
    futureNotes: "Koppelt search rank & snippets aan company enrichment.",
  },
  {
    id: "company-website",
    name: "Company Website",
    description:
      "Website crawl voor contact, about en social links (mock — geen scraping).",
    connectorType: "website",
    connectorName: "website-enrichment-connector",
    version: "0.1.0-mock",
    badges: ["ready", "mock_source", "healthy"],
    confidence: 81,
    coverage: 69,
    freshness: 74,
    lastSyncAt: "2026-07-26T12:05:00.000Z",
    queueStatus: "idle",
    estimatedRecords: 5200,
    futureAvailability: "Ready for connector wiring (no live crawl yet)",
    averageRuntimeMs: 1800,
    averageConfidence: 79,
    health: "healthy",
    healthMessage: "Architectuur klaar — scraping bewust uitgeschakeld.",
    fields: [
      "Emails",
      "Phone Numbers",
      "Contact Page",
      "About Page",
      "Social Links",
      "Products",
      "Services",
    ],
    pipeline: pipeline({
      search: "completed",
      fetch: "mock",
      normalize: "completed",
      validate: "mock",
      store: "waiting",
      enrich: "future",
      crm: "future",
    }),
    futureNotes: "Wordt gevoed door respectvolle website connector + queue.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Bedrijfsprofielen: industrie, medewerkers, HQ (mock).",
    connectorType: "social",
    connectorName: "linkedin-connector",
    version: "0.0.1-mock",
    badges: ["coming_soon", "inactive", "mock_source"],
    confidence: 42,
    coverage: 35,
    freshness: 20,
    lastSyncAt: null,
    queueStatus: "idle",
    estimatedRecords: 0,
    futureAvailability: "Pending compliance + partner API",
    averageRuntimeMs: 0,
    averageConfidence: 40,
    health: "offline",
    healthMessage: "Geen live LinkedIn API — alleen UI-contract.",
    fields: ["Industry", "Employees", "Headquarters", "Website"],
    pipeline: pipeline({
      search: "future",
      fetch: "future",
      normalize: "future",
      validate: "future",
      store: "future",
      enrich: "future",
      crm: "future",
    }),
    futureNotes: "Interface gereserveerd; geen scraping of unofficial clients.",
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Page metadata: followers, categorie, website (mock).",
    connectorType: "social",
    connectorName: "facebook-connector",
    version: "0.0.1-mock",
    badges: ["coming_soon", "disabled", "mock_source"],
    confidence: 38,
    coverage: 30,
    freshness: 15,
    lastSyncAt: null,
    queueStatus: "idle",
    estimatedRecords: 0,
    futureAvailability: "Meta Graph API — later",
    averageRuntimeMs: 0,
    averageConfidence: 36,
    health: "offline",
    healthMessage: "Disabled tot API-toegang beschikbaar is.",
    fields: ["Followers", "Category", "Website"],
    pipeline: pipeline({
      search: "future",
      fetch: "future",
      normalize: "future",
      validate: "future",
      store: "future",
      enrich: "future",
      crm: "future",
    }),
    futureNotes: "Mock card voor future social enrichment.",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Profielsignalen: followers, bio, website (mock).",
    connectorType: "social",
    connectorName: "instagram-connector",
    version: "0.0.1-mock",
    badges: ["coming_soon", "inactive", "mock_source"],
    confidence: 36,
    coverage: 28,
    freshness: 12,
    lastSyncAt: null,
    queueStatus: "idle",
    estimatedRecords: 0,
    futureAvailability: "Meta / Instagram Graph — later",
    averageRuntimeMs: 0,
    averageConfidence: 34,
    health: "offline",
    healthMessage: "Nog niet aangesloten.",
    fields: ["Followers", "Bio", "Website"],
    pipeline: pipeline({
      search: "future",
      fetch: "future",
      normalize: "future",
      validate: "future",
      store: "future",
      enrich: "future",
      crm: "future",
    }),
    futureNotes: "Alleen catalogus + interfaces in deze fase.",
  },
  {
    id: "openstreetmap",
    name: "OpenStreetMap",
    description: "Open geo-data: coördinaten en adres (mock).",
    connectorType: "geo",
    connectorName: "openstreetmap-connector",
    version: "0.1.0-mock",
    badges: ["ready", "mock_source", "healthy"],
    confidence: 71,
    coverage: 66,
    freshness: 80,
    lastSyncAt: "2026-07-26T08:20:00.000Z",
    queueStatus: "queued",
    estimatedRecords: 9800,
    futureAvailability: "Nominatim / Overpass — gepland",
    averageRuntimeMs: 1500,
    averageConfidence: 70,
    health: "healthy",
    healthMessage: "Mock geo responses beschikbaar voor UI-tests.",
    fields: ["Coordinates", "Address"],
    pipeline: pipeline({
      search: "mock",
      fetch: "completed",
      normalize: "mock",
      validate: "waiting",
      store: "future",
      enrich: "future",
      crm: "future",
    }),
    futureNotes: "Open data connector — geen Google dependency.",
  },
  {
    id: "opencorporates",
    name: "OpenCorporates",
    description:
      "Bedrijfsregistratie: nummer, status, registration (mock).",
    connectorType: "registry",
    connectorName: "opencorporates-connector",
    version: "0.1.0-mock",
    badges: ["mock_source", "coming_soon", "warning"],
    confidence: 55,
    coverage: 48,
    freshness: 50,
    lastSyncAt: "2026-07-24T14:00:00.000Z",
    queueStatus: "retrying",
    estimatedRecords: 2100,
    futureAvailability: "OpenCorporates API key required",
    averageRuntimeMs: 4200,
    averageConfidence: 52,
    health: "warning",
    healthMessage: "Mock registry — live key nog niet geconfigureerd.",
    fields: ["Company Number", "Registration", "Status"],
    pipeline: pipeline({
      search: "mock",
      fetch: "mock",
      normalize: "waiting",
      validate: "waiting",
      store: "future",
      enrich: "future",
      crm: "future",
    }),
    futureNotes: "Vervangt KvK placeholders in enrichment engine.",
  },
];

export type SourcesConfidenceDashboard = {
  overallConfidence: number;
  freshness: number;
  coverage: number;
  reliability: number;
  completeness: number;
};

export type SourcesHealthSummary = {
  healthySources: number;
  inactiveSources: number;
  averageResponseTimeMs: number;
  averageConfidence: number;
  connectorReadinessPercent: number;
  futureApiReadinessPercent: number;
};

export function getSourcesConfidenceDashboard(
  sources: IntelligenceSourceCard[] = INTELLIGENCE_SOURCE_CARDS,
): SourcesConfidenceDashboard {
  const avg = (values: number[]) =>
    Math.round(values.reduce((sum, n) => sum + n, 0) / Math.max(values.length, 1));

  return {
    overallConfidence: avg(sources.map((s) => s.confidence)),
    freshness: avg(sources.map((s) => s.freshness)),
    coverage: avg(sources.map((s) => s.coverage)),
    reliability: avg(
      sources.map((s) =>
        s.health === "healthy" ? 85 : s.health === "warning" ? 55 : 25,
      ),
    ),
    completeness: avg(
      sources.map((s) => Math.min(100, s.fields.length * 12)),
    ),
  };
}

export function getSourcesHealthSummary(
  sources: IntelligenceSourceCard[] = INTELLIGENCE_SOURCE_CARDS,
): SourcesHealthSummary {
  const healthySources = sources.filter((s) => s.health === "healthy").length;
  const inactiveSources = sources.filter(
    (s) =>
      s.badges.includes("inactive") ||
      s.badges.includes("disabled") ||
      s.health === "offline",
  ).length;
  const withRuntime = sources.filter((s) => s.averageRuntimeMs > 0);
  const averageResponseTimeMs = Math.round(
    withRuntime.reduce((sum, s) => sum + s.averageRuntimeMs, 0) /
      Math.max(withRuntime.length, 1),
  );
  const averageConfidence = Math.round(
    sources.reduce((sum, s) => sum + s.averageConfidence, 0) /
      Math.max(sources.length, 1),
  );
  const readyCount = sources.filter(
    (s) => s.badges.includes("ready") || s.badges.includes("healthy"),
  ).length;

  return {
    healthySources,
    inactiveSources,
    averageResponseTimeMs,
    averageConfidence,
    connectorReadinessPercent: Math.round(
      (readyCount / Math.max(sources.length, 1)) * 100,
    ),
    futureApiReadinessPercent: 28,
  };
}

export function getIntelligenceSourceById(
  id: string,
): IntelligenceSourceCard | null {
  return INTELLIGENCE_SOURCE_CARDS.find((source) => source.id === id) ?? null;
}
