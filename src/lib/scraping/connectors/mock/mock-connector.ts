/**
 * MockConnector — generates 25 fictional businesses for local pipeline tests.
 * No network, no APIs, no browser automation.
 */

import type { ConnectorCapabilities } from "@/lib/scraping/connectors/capabilities";
import { MOCK_CAPABILITIES } from "@/lib/scraping/connectors/capabilities";
import type { Connector } from "@/lib/scraping/connectors/connector";
import {
  ConnectorNotConnectedError,
  ConnectorValidationError,
} from "@/lib/scraping/connectors/errors";
import { parseSearchHits } from "@/lib/scraping/connectors/pipeline/parser";
import { normalizeBusinessResults } from "@/lib/scraping/connectors/pipeline/normalizer";
import type {
  ConnectorCode,
  ConnectorSearchHit,
  ConnectorSearchInput,
  ConnectorSearchResponse,
  ConnectorSearchResult,
  ConnectorStatus,
  HealthStatus,
} from "@/lib/scraping/connectors/types";

const MOCK_CODE: ConnectorCode = "mock";
const DEFAULT_LIMIT = 25;

type MockSeed = {
  sourceId: string;
  name: string;
  website?: string | null;
  emails?: string[];
  phones?: string[];
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  region?: string | null;
  countryCode?: string | null;
  industry?: string | null;
  categories?: string[];
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  confidence: number;
};

/**
 * 25 fictional companies with intentional gaps, invalids, and duplicates
 * so the pipeline can exercise validation and deduplication.
 */
const MOCK_SEEDS: MockSeed[] = [
  {
    sourceId: "mock-001",
    name: "Aurora Warehouse Solutions BV",
    website: "https://aurora-warehouse.example",
    emails: ["info@aurora-warehouse.example"],
    phones: ["+31 20 555 0101"],
    street: "Havenstraat 12",
    postalCode: "1013 AB",
    city: "Amsterdam",
    region: "Noord-Holland",
    countryCode: "NL",
    industry: "logistics",
    categories: ["warehousing", "fulfillment"],
    description: "Fictional warehouse operator for Northern Europe.",
    latitude: 52.3791,
    longitude: 4.9003,
    confidence: 0.92,
  },
  {
    sourceId: "mock-002",
    name: "Nordlicht Packaging GmbH",
    website: "https://nordlicht-packaging.example",
    emails: ["sales@nordlicht-packaging.example"],
    phones: ["+49 30 555 2200"],
    street: "Industriestrasse 8",
    postalCode: "10115",
    city: "Berlin",
    region: "Berlin",
    countryCode: "DE",
    industry: "manufacturing",
    categories: ["packaging"],
    description: "Mock packaging manufacturer.",
    latitude: 52.52,
    longitude: 13.405,
    confidence: 0.88,
  },
  {
    sourceId: "mock-003",
    name: "Schelde Retail Advisors",
    website: "https://schelde-retail.example",
    emails: ["hello@schelde-retail.example"],
    phones: ["+32 3 555 77 10"],
    street: "Kade 4",
    postalCode: "2000",
    city: "Antwerp",
    region: "Antwerpen",
    countryCode: "BE",
    industry: "retail",
    categories: ["consulting"],
    description: null,
    latitude: 51.2194,
    longitude: 4.4025,
    confidence: 0.81,
  },
  {
    sourceId: "mock-004",
    name: "Loire Fresh Produce SAS",
    website: "https://loire-fresh.example",
    emails: ["contact@loire-fresh.example", "orders@loire-fresh.example"],
    phones: ["+33 2 40 55 01 01"],
    street: "Rue des Entrepots 19",
    postalCode: "44000",
    city: "Nantes",
    region: "Pays de la Loire",
    countryCode: "FR",
    industry: "food",
    categories: ["wholesale", "produce"],
    description: "Fictional produce wholesaler.",
    latitude: 47.2184,
    longitude: -1.5536,
    confidence: 0.79,
  },
  {
    sourceId: "mock-005",
    name: "Thames Cold Chain Ltd",
    website: "https://thames-coldchain.example",
    emails: ["ops@thames-coldchain.example"],
    phones: ["+44 20 7946 0958"],
    street: "Dock Road 55",
    postalCode: "E16 1AH",
    city: "London",
    region: "Greater London",
    countryCode: "GB",
    industry: "logistics",
    categories: ["cold-chain"],
    description: "Mock refrigerated logistics firm.",
    latitude: 51.5074,
    longitude: -0.1278,
    confidence: 0.9,
  },
  {
    sourceId: "mock-006",
    name: "Prairie Grain Analytics Inc",
    website: "https://prairie-grain.example",
    emails: ["team@prairie-grain.example"],
    phones: ["+1 312 555 0199"],
    street: "West Loop Ave 210",
    postalCode: "60661",
    city: "Chicago",
    region: "Illinois",
    countryCode: "US",
    industry: "agriculture",
    categories: ["analytics"],
    description: "Fictional agri-data company.",
    latitude: 41.8781,
    longitude: -87.6298,
    confidence: 0.74,
  },
  {
    sourceId: "mock-007",
    name: "Alpen Soft Goods AG",
    website: "https://alpen-softgoods.example",
    emails: ["info@alpen-softgoods.example"],
    phones: ["+41 44 555 33 22"],
    street: "Bahnhofstrasse 3",
    postalCode: "8001",
    city: "Zurich",
    region: "Zurich",
    countryCode: "CH",
    industry: "retail",
    categories: ["apparel"],
    description: null,
    latitude: 47.3769,
    longitude: 8.5417,
    confidence: 0.7,
  },
  {
    sourceId: "mock-008",
    name: "Tagus Digital Studio",
    website: "https://tagus-digital.example",
    emails: ["studio@tagus-digital.example"],
    phones: ["+351 21 555 0404"],
    street: "Rua da Ribeira 7",
    postalCode: "1100-053",
    city: "Lisbon",
    region: "Lisboa",
    countryCode: "PT",
    industry: "technology",
    categories: ["design", "web"],
    description: "Mock digital studio.",
    latitude: 38.7223,
    longitude: -9.1393,
    confidence: 0.83,
  },
  {
    sourceId: "mock-009",
    name: "Vistula Machining Sp. z o.o.",
    website: "https://vistula-machining.example",
    emails: ["biuro@vistula-machining.example"],
    phones: ["+48 22 555 66 77"],
    street: "Fabryczna 14",
    postalCode: "00-001",
    city: "Warsaw",
    region: "Mazowieckie",
    countryCode: "PL",
    industry: "manufacturing",
    categories: ["cnc"],
    description: "Fictional machining shop.",
    latitude: 52.2297,
    longitude: 21.0122,
    confidence: 0.77,
  },
  {
    sourceId: "mock-010",
    name: "Øresund Marine Parts AB",
    website: "https://oresund-marine.example",
    emails: ["support@oresund-marine.example"],
    phones: ["+46 40 555 12 12"],
    street: "Hamngatan 2",
    postalCode: "211 22",
    city: "Malmö",
    region: "Skåne",
    countryCode: "SE",
    industry: "maritime",
    categories: ["parts"],
    description: null,
    latitude: 55.605,
    longitude: 13.0038,
    confidence: 0.86,
  },
  // Missing website / email / phone intentionally
  {
    sourceId: "mock-011",
    name: "Canal Side Printworks",
    website: null,
    emails: [],
    phones: [],
    street: "Prinsengracht 88",
    postalCode: "1015 DX",
    city: "Amsterdam",
    region: "Noord-Holland",
    countryCode: "NL",
    industry: "print",
    categories: ["print"],
    description: "Incomplete fictional print shop.",
    latitude: 52.3731,
    longitude: 4.8922,
    confidence: 0.55,
  },
  {
    sourceId: "mock-012",
    name: "Bruges Chocolate Atelier Mock",
    website: "https://bruges-atelier.example",
    emails: [],
    phones: ["+32 50 555 09 09"],
    street: null,
    postalCode: null,
    city: "Bruges",
    region: "West-Vlaanderen",
    countryCode: "BE",
    industry: "food",
    categories: ["confectionery"],
    description: "Missing street on purpose.",
    latitude: null,
    longitude: null,
    confidence: 0.61,
  },
  {
    sourceId: "mock-013",
    name: "Danube Office Fitouts",
    website: "https://danube-fitouts.example",
    emails: ["hello@danube-fitouts.example"],
    phones: [],
    street: "Handelskai 92",
    postalCode: "1200",
    city: "Vienna",
    region: "Vienna",
    countryCode: "AT",
    industry: "construction",
    categories: ["fitout"],
    description: "Fictional office fit-out firm.",
    latitude: 48.210033,
    longitude: 16.363449,
    confidence: 0.68,
  },
  {
    sourceId: "mock-014",
    name: "Tyrrhenian Solar Kits",
    website: "https://tyrrhenian-solar.example",
    emails: ["info@tyrrhenian-solar.example"],
    phones: ["+39 06 5550 3344"],
    street: "Via del Porto 15",
    postalCode: "00153",
    city: "Rome",
    region: "Lazio",
    countryCode: "IT",
    industry: "energy",
    categories: ["solar"],
    description: null,
    latitude: 41.9028,
    longitude: 12.4964,
    confidence: 0.8,
  },
  {
    sourceId: "mock-015",
    name: "Cedar Ridge Safety Supply",
    website: "https://cedar-ridge-safety.example",
    emails: ["orders@cedar-ridge-safety.example"],
    phones: ["+1 416 555 0177"],
    street: "Queen St W 640",
    postalCode: "M5V 2B7",
    city: "Toronto",
    region: "Ontario",
    countryCode: "CA",
    industry: "safety",
    categories: ["ppe"],
    description: "Mock PPE distributor.",
    latitude: 43.6532,
    longitude: -79.3832,
    confidence: 0.73,
  },
  // Invalid country code
  {
    sourceId: "mock-016",
    name: "Invalid Country Sample Co",
    website: "https://invalid-country.example",
    emails: ["info@invalid-country.example"],
    phones: ["+99 000 0000"],
    city: "Nowhere",
    countryCode: "XX",
    industry: "other",
    categories: [],
    description: "Intentionally invalid country for validator tests.",
    confidence: 0.4,
  },
  // Invalid website
  {
    sourceId: "mock-017",
    name: "Broken Url Trading Desk",
    website: "not-a-valid-url",
    emails: ["desk@broken-url.example"],
    phones: ["+31 10 555 0001"],
    city: "Rotterdam",
    countryCode: "NL",
    industry: "finance",
    categories: ["trading"],
    description: "Intentionally invalid website.",
    confidence: 0.45,
  },
  // Invalid email
  {
    sourceId: "mock-018",
    name: "Bad Email Samples BV",
    website: "https://bad-email.example",
    emails: ["not-an-email"],
    phones: ["+31 30 555 2222"],
    city: "Utrecht",
    countryCode: "NL",
    industry: "services",
    categories: ["samples"],
    description: "Intentionally invalid email.",
    confidence: 0.5,
  },
  // Invalid confidence
  {
    sourceId: "mock-019",
    name: "Overconfident Demo Group",
    website: "https://overconfident.example",
    emails: ["info@overconfident.example"],
    phones: ["+49 40 555 1111"],
    city: "Hamburg",
    countryCode: "DE",
    industry: "services",
    categories: ["demo"],
    description: "Intentionally out-of-range confidence.",
    confidence: 1.5,
  },
  // Missing name → invalid
  {
    sourceId: "mock-020",
    name: "   ",
    website: "https://missing-name.example",
    emails: ["info@missing-name.example"],
    city: "Ghent",
    countryCode: "BE",
    industry: "other",
    categories: [],
    description: "Intentionally blank name.",
    confidence: 0.3,
  },
  // Duplicate of mock-001 by source+sourceId (same id, slightly worse)
  {
    sourceId: "mock-001",
    name: "Aurora Warehouse Solutions BV",
    website: "https://aurora-warehouse.example",
    emails: ["alt@aurora-warehouse.example"],
    phones: ["+31 20 555 0101"],
    street: "Havenstraat 12",
    postalCode: "1013 AB",
    city: "Amsterdam",
    region: "Noord-Holland",
    countryCode: "NL",
    industry: "logistics",
    categories: ["warehousing"],
    description: "Duplicate sourceId — lower confidence.",
    latitude: 52.3791,
    longitude: 4.9003,
    confidence: 0.6,
  },
  // Duplicate by domain of mock-002
  {
    sourceId: "mock-021",
    name: "Nordlicht Packaging Duplicate",
    website: "https://www.nordlicht-packaging.example/about",
    emails: ["dup@nordlicht-packaging.example"],
    phones: ["+49 30 555 2299"],
    city: "Berlin",
    countryCode: "DE",
    industry: "manufacturing",
    categories: ["packaging"],
    description: "Duplicate domain of Nordlicht.",
    confidence: 0.5,
  },
  // Duplicate by name + city of mock-003
  {
    sourceId: "mock-022",
    name: "Schelde Retail Advisors",
    website: "https://schelde-retail-alt.example",
    emails: ["alt@schelde-retail-alt.example"],
    phones: ["+32 3 555 77 99"],
    city: "Antwerp",
    countryCode: "BE",
    industry: "retail",
    categories: ["consulting"],
    description: "Duplicate name+city of Schelde.",
    confidence: 0.55,
  },
  {
    sourceId: "mock-023",
    name: "Fjord Kitchen Equipment AS",
    website: "https://fjord-kitchen.example",
    emails: ["sales@fjord-kitchen.example"],
    phones: ["+47 22 55 01 01"],
    street: "Kai 11",
    postalCode: "0150",
    city: "Oslo",
    region: "Oslo",
    countryCode: "NO",
    industry: "hospitality",
    categories: ["equipment"],
    description: "Fictional kitchen supplier.",
    latitude: 59.9139,
    longitude: 10.7522,
    confidence: 0.84,
  },
  {
    sourceId: "mock-024",
    name: "Iberia Label Printing SL",
    website: "https://iberia-labels.example",
    emails: ["hola@iberia-labels.example"],
    phones: ["+34 93 555 88 01"],
    street: "Carrer del Port 21",
    postalCode: "08003",
    city: "Barcelona",
    region: "Catalonia",
    countryCode: "ES",
    industry: "print",
    categories: ["labels"],
    description: "Mock label printer.",
    latitude: 41.3874,
    longitude: 2.1686,
    confidence: 0.78,
  },
];

function seedToHit(seed: MockSeed): ConnectorSearchHit {
  return {
    sourceId: seed.sourceId,
    name: seed.name,
    website: seed.website ?? null,
    emails: seed.emails ?? [],
    phones: seed.phones ?? [],
    street: seed.street ?? null,
    postalCode: seed.postalCode ?? null,
    city: seed.city ?? null,
    region: seed.region ?? null,
    countryCode: seed.countryCode ?? null,
    industry: seed.industry ?? null,
    categories: seed.categories ?? [],
    description: seed.description ?? null,
    latitude: seed.latitude ?? null,
    longitude: seed.longitude ?? null,
    confidence: seed.confidence,
    sourceUrl: `https://mock.lead-engine.local/foundation/${MOCK_CODE}/${seed.sourceId}`,
    raw: { mock: true, seedId: seed.sourceId },
  };
}

export class MockConnector implements Connector {
  readonly code = MOCK_CODE;
  readonly name = "Mock Connector";
  readonly capabilities: ConnectorCapabilities = MOCK_CAPABILITIES;

  private _status: ConnectorStatus = "idle";

  get status(): ConnectorStatus {
    return this._status;
  }

  async connect(): Promise<void> {
    this._status = "connected";
  }

  async disconnect(): Promise<void> {
    this._status = "disconnected";
  }

  async validate(input: ConnectorSearchInput): Promise<boolean> {
    const query = input.query?.trim() ?? "";
    if (query.length < 2) {
      return false;
    }
    if (input.limit !== undefined && (input.limit < 1 || input.limit > 100)) {
      return false;
    }
    return true;
  }

  async search(input: ConnectorSearchInput): Promise<ConnectorSearchResponse> {
    if (this._status !== "connected") {
      throw new ConnectorNotConnectedError(this.code);
    }

    const valid = await this.validate(input);
    if (!valid) {
      throw new ConnectorValidationError(
        "Search input failed validation",
        this.code,
      );
    }

    const limit = input.limit ?? DEFAULT_LIMIT;
    const hits = MOCK_SEEDS.slice(0, Math.min(limit, MOCK_SEEDS.length)).map(
      seedToHit,
    );

    return this.normalize(hits);
  }

  async normalize(hits: ConnectorSearchHit[]): Promise<ConnectorSearchResponse> {
    const parsed = parseSearchHits(this.code, hits);
    const results: ConnectorSearchResult[] = normalizeBusinessResults(parsed);

    return {
      connectorCode: this.code,
      results,
      total: results.length,
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    return this._status === "error" ? "unhealthy" : "healthy";
  }
}

export function createMockConnector(): MockConnector {
  return new MockConnector();
}
