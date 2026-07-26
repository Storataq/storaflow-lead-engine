/**
 * Lightweight contact-person heuristics from team/contact text.
 */

import type { DiscoveredPerson, PageType, ReviewStatus } from "@/lib/enrichment/types";
import { normalizeEmail } from "@/lib/enrichment/email-validation/email";

const TITLE_HINTS =
  /\b(ceo|cto|cfo|founder|director|manager|owner|partner|adviseur|consultant|sales|marketing)\b/i;

export function discoverPeopleFromText(input: {
  text: string;
  sourceUrl: string;
  pageType: PageType;
  emails: string[];
}): DiscoveredPerson[] {
  if (input.pageType !== "team" && input.pageType !== "about" && input.pageType !== "contact") {
    return [];
  }

  const people: DiscoveredPerson[] = [];
  const lines = input.text.split(/[.\n|•]/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines.slice(0, 80)) {
    const nameMatch = line.match(
      /\b([A-ZÁÉÍÓÚÄÖÜ][a-záéíóúäöü'-]+)\s+([A-ZÁÉÍÓÚÄÖÜ][a-záéíóúäöü'-]+)\b/,
    );
    if (!nameMatch) continue;
    const fullName = `${nameMatch[1]} ${nameMatch[2]}`;
    const title = TITLE_HINTS.test(line)
      ? line.match(TITLE_HINTS)?.[0] ?? null
      : null;
    const nearbyEmail =
      input.emails.find((email) =>
        line.toLowerCase().includes(email.split("@")[0] ?? ""),
      ) ?? null;

    const confidence = title ? 55 : nearbyEmail ? 50 : 35;
    const reviewStatus: ReviewStatus =
      confidence >= 55 ? "needs_review" : "needs_review";

    people.push({
      fullName,
      firstName: nameMatch[1] ?? null,
      lastName: nameMatch[2] ?? null,
      jobTitle: title,
      email: nearbyEmail ? normalizeEmail(nearbyEmail) : null,
      phone: null,
      confidence,
      sourceUrl: input.sourceUrl,
      reasons: [
        `Name-like pattern on ${input.pageType} page`,
        title ? "Job-title keyword nearby" : "No strong title signal",
      ],
      reviewStatus,
    });

    if (people.length >= 8) break;
  }

  return people;
}
