/**
 * Exposes website-enrichment signals to qualification / opportunity engines
 * without duplicating their scoring algorithms.
 */

export type EnrichmentContactabilitySignals = {
  websiteReachable: boolean | null;
  emailAvailable: boolean;
  phoneAvailable: boolean;
  namedContactAvailable: boolean;
  socialProfileAvailable: boolean;
  dataCompleteness: number;
  sourceConfidence: number;
  recommendedChannelHint: "email" | "phone" | "manual_research" | "unknown";
  missingPrerequisites: string[];
};

/**
 * Derive contactability hints from enrichment snapshot counts.
 * Callers feed these into existing engines; do not recalculate opportunity score here.
 */
export function deriveEnrichmentContactability(input: {
  availability?: string | null;
  emailsFound?: number;
  phonesFound?: number;
  peopleFound?: number;
  socialsFound?: number;
  pagesProcessed?: number;
}): EnrichmentContactabilitySignals {
  const emails = input.emailsFound ?? 0;
  const phones = input.phonesFound ?? 0;
  const people = input.peopleFound ?? 0;
  const socials = input.socialsFound ?? 0;
  const pages = input.pagesProcessed ?? 0;
  const reachable =
    input.availability === "reachable" || input.availability === "redirected"
      ? true
      : input.availability
        ? false
        : null;

  const filled = [
    reachable === true,
    emails > 0,
    phones > 0,
    people > 0,
    socials > 0,
    pages > 0,
  ].filter(Boolean).length;

  const missing: string[] = [];
  if (!emails) missing.push("Public email");
  if (!phones) missing.push("Public phone");
  if (!people) missing.push("Named contact");
  if (reachable === false) missing.push("Reachable website");

  let channel: EnrichmentContactabilitySignals["recommendedChannelHint"] =
    "unknown";
  if (emails > 0) channel = "email";
  else if (phones > 0) channel = "phone";
  else if (reachable !== false) channel = "manual_research";

  return {
    websiteReachable: reachable,
    emailAvailable: emails > 0,
    phoneAvailable: phones > 0,
    namedContactAvailable: people > 0,
    socialProfileAvailable: socials > 0,
    dataCompleteness: Math.round((filled / 6) * 100),
    sourceConfidence: Math.min(
      95,
      40 + emails * 8 + phones * 6 + (reachable ? 15 : 0),
    ),
    recommendedChannelHint: channel,
    missingPrerequisites: missing,
  };
}
