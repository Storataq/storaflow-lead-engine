/**
 * Shared mock company generator — no network.
 */

import type {
  ConnectorCode,
  ConnectorJob,
  ConnectorResult,
} from "@/lib/scraping/types/connector";

const SUFFIXES = [
  "Group",
  "BV",
  "Ltd",
  "GmbH",
  "SAS",
  "Inc",
  "Partners",
  "Studio",
  "Services",
  "Solutions",
];

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function pick<T>(items: T[] | undefined, index: number, fallback: T): T {
  if (!items?.length) return fallback;
  return items[index % items.length] ?? fallback;
}

export function generateMockCompanies(input: {
  sourceCode: ConnectorCode;
  job: ConnectorJob;
  count: number;
}): ConnectorResult[] {
  const keyword = input.job.keywords[0] ?? "Business";
  const industry = input.job.industries[0] ?? "professional_services";
  const country = pick(input.job.countries, input.job.pageIndex, "NL");
  const city = pick(input.job.cities, input.job.pageIndex, "Amsterdam");
  const region = pick(input.job.regions, input.job.pageIndex, "");

  const results: ConnectorResult[] = [];
  for (let i = 0; i < input.count; i += 1) {
    const n = input.job.pageIndex * input.count + i + 1;
    const suffix = pick(SUFFIXES, n, "Group");
    const companyName = `${keyword} ${suffix} ${n}`;
    const domain = `${slugify(companyName) || "mock-co"}.example`;
    const sourceUrl = `https://mock.lead-engine.local/connectors/${input.sourceCode}/jobs/${input.job.jobId}/page/${input.job.pageIndex + 1}/item/${i + 1}`;

    results.push({
      companyName,
      address: `${10 + n} Mock Street`,
      city,
      region: region || null,
      country,
      postalCode: `${1000 + (n % 9000)}`,
      phone: `+31 20 ${String(1000000 + n).slice(0, 7)}`,
      email: `info@${domain}`,
      website: `https://${domain}`,
      linkedinUrl: `https://www.linkedin.com/company/${slugify(companyName)}`,
      facebookUrl: null,
      instagramUrl: null,
      sourceUrl,
      sourceCode: input.sourceCode,
      score: Math.max(40, 100 - (n % 40)),
      category: industry,
      latitude: 52.37 + (n % 100) / 1000,
      longitude: 4.89 + (n % 100) / 1000,
      openingHours: "Mo-Fr 09:00-17:00",
      reviewsCount: (n * 3) % 250,
      reviewsRating: Number((3 + (n % 20) / 10).toFixed(1)),
      raw: { mock: true, connector: input.sourceCode, index: n },
    });
  }
  return results;
}
