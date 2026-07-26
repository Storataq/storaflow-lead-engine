/**
 * MockWorker — local progress simulation only.
 * Advances through MOCK_PROGRESS_STEPS and emits synthetic companies.
 */

import {
  DEFAULT_WORKER_CODE,
  MOCK_COMPANIES_PER_STEP,
  MOCK_PROGRESS_STEPS,
} from "@/lib/jobs/constants";
import type {
  JobWorker,
  WorkerTickContext,
  WorkerTickResult,
} from "@/lib/jobs/workers/types";
import type { DiscoveredCompany } from "@/lib/scraping/types";

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

export class MockWorker implements JobWorker {
  readonly code = DEFAULT_WORKER_CODE;
  readonly displayName = "Mock Worker";

  canHandle(): boolean {
    return true;
  }

  async processTick(context: WorkerTickContext): Promise<WorkerTickResult> {
    const { searchQuery, job, stepIndex } = context;
    const progressPercent =
      MOCK_PROGRESS_STEPS[
        Math.min(stepIndex, MOCK_PROGRESS_STEPS.length - 1)
      ] ?? 100;
    const done = stepIndex >= MOCK_PROGRESS_STEPS.length - 1;

    const keyword =
      searchQuery.keywords?.[0] ?? searchQuery.keyword ?? "Business";
    const industry =
      searchQuery.industries?.[0] ??
      searchQuery.industry ??
      "professional_services";
    const country =
      searchQuery.countries?.[0] ?? searchQuery.country ?? "NL";
    const city = pick(
      searchQuery.cities,
      stepIndex,
      searchQuery.city ?? "Amsterdam",
    );
    const region = pick(
      searchQuery.regions,
      stepIndex,
      searchQuery.region ?? "",
    );

    const companies: DiscoveredCompany[] = [];
    for (let i = 0; i < MOCK_COMPANIES_PER_STEP; i += 1) {
      const n = stepIndex * MOCK_COMPANIES_PER_STEP + i + 1;
      const suffix = pick(SUFFIXES, n, "Group");
      const companyName = `${keyword} ${suffix} ${n}`;
      const domain = `${slugify(companyName) || "mock-co"}.example`;

      companies.push({
        companyName,
        websiteUrl: `https://${domain}`,
        sourceUrl: `https://mock.lead-engine.local/jobs/${job.id}/step/${stepIndex + 1}/item/${i + 1}`,
        sourceType: "search_result",
        city,
        region: region || undefined,
        country,
        industry,
      });
    }

    return {
      workerCode: this.code,
      progressPercent,
      companies,
      contactsFound: 0,
      done,
      message: done
        ? `Completed at ${progressPercent}%`
        : `Progress ${progressPercent}%`,
      meta: { stepIndex, mock: true },
    };
  }
}

export const mockWorker = new MockWorker();
