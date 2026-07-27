/**
 * Opportunity detection from website/analysis signals.
 */

import {
  OPPORTUNITY_LABELS,
  type OpportunityCode,
} from "@/lib/prospecting/constants";
import type { DetectedOpportunity } from "@/lib/prospecting/types";

export type OpportunitySignals = {
  htmlText: string;
  hasWebshopHints: boolean;
  hasBookingHints: boolean;
  hasCrmHints: boolean;
  hasInventoryHints: boolean;
  websiteLooksOutdated: boolean;
  hasMultipleLocations: boolean;
  internationalHints: boolean;
  growthHints: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  businessClass?: string | null;
};

function push(
  list: DetectedOpportunity[],
  code: OpportunityCode,
  severity: DetectedOpportunity["severity"],
  rationale: string,
) {
  list.push({
    code,
    label: OPPORTUNITY_LABELS[code],
    severity,
    rationale,
  });
}

export function detectOpportunities(
  signals: OpportunitySignals,
): DetectedOpportunity[] {
  const out: DetectedOpportunity[] = [];
  const hay = signals.htmlText.toLowerCase();

  if (!signals.hasCrmHints && !/hubspot|salesforce|pipedrive|dynamics/i.test(hay)) {
    push(out, "no_crm", "medium", "Geen duidelijke CRM-signalen op de website");
  }
  if (signals.websiteLooksOutdated) {
    push(
      out,
      "outdated_website",
      "high",
      "Website toont verouderde of zwakke digitale signalen",
    );
  }
  if (
    !signals.hasBookingHints &&
    /hotel|restaurant|salon|kliniek|afspraak/i.test(hay)
  ) {
    push(
      out,
      "no_online_booking",
      "medium",
      "Dienstverlener zonder online booking signalen",
    );
  }
  if (
    !signals.hasInventoryHints &&
    /voorraad|warehouse|wholesale|magazijn/i.test(hay)
  ) {
    push(
      out,
      "no_inventory_software",
      "medium",
      "Voorraad/warehouse context zonder software-hints",
    );
  }
  if (!signals.hasWebshopHints && /producten|catalogus|assortiment/i.test(hay)) {
    push(out, "no_webshop", "low", "Productfocus zonder webshop-signalen");
  }
  if (/handmatig|excel|papier|telefoon bestellen/i.test(hay)) {
    push(out, "manual_work_heavy", "high", "Signalen van handmatige processen");
  }
  if (signals.growthHints || /groei|uitbreiding|hiring|vacatures/i.test(hay)) {
    push(out, "strong_growth", "medium", "Groei- of hiring-signalen");
  }
  if (signals.internationalHints) {
    push(
      out,
      "international_expansion",
      "medium",
      "Internationale of multi-country signalen",
    );
  }
  if (signals.hasMultipleLocations || /vestigingen|locaties|filialen/i.test(hay)) {
    push(out, "new_locations", "low", "Meerdere vestigingen / locaties");
  }
  if (!signals.hasEmail && !signals.hasPhone) {
    push(
      out,
      "weak_contactability",
      "high",
      "Geen e-mail of telefoon gevonden",
    );
  }

  const fitClasses = [
    "software",
    "wholesale",
    "logistics",
    "manufacturing",
    "retail",
    "hospitality",
  ];
  if (fitClasses.includes(signals.businessClass ?? "")) {
    push(
      out,
      "storaflow_fit",
      "medium",
      "Branche past bij Storaflow ICP",
    );
  }

  return out;
}

export function suggestDecisionMakers(businessClass?: string | null): Array<{
  role: string;
  rationale: string;
  priority: number;
}> {
  const base = [
    {
      role: "Owner",
      rationale: "Beslisser bij MKB",
      priority: 1,
    },
    {
      role: "Managing Director",
      rationale: "Operationele eindverantwoordelijke",
      priority: 2,
    },
    {
      role: "CEO",
      rationale: "Strategische beslisser",
      priority: 3,
    },
  ];

  const byClass: Record<string, Array<{ role: string; rationale: string; priority: number }>> = {
    retail: [
      { role: "Purchasing Manager", rationale: "Inkoop & assortiment", priority: 2 },
      { role: "Operations Manager", rationale: "Winkels / fulfillment", priority: 3 },
      { role: "Marketing Manager", rationale: "Online acquisitie", priority: 4 },
    ],
    logistics: [
      { role: "Operations Manager", rationale: "Warehouse & planning", priority: 2 },
      { role: "Warehouse Manager", rationale: "Voorraadprocessen", priority: 3 },
      { role: "IT Manager", rationale: "Systemen & integraties", priority: 4 },
    ],
    manufacturing: [
      { role: "Operations Manager", rationale: "Productieprocessen", priority: 2 },
      { role: "Purchasing Manager", rationale: "Inkoopketen", priority: 3 },
      { role: "Sales Manager", rationale: "Afzetkanalen", priority: 4 },
    ],
    software: [
      { role: "IT Manager", rationale: "Stack & tooling", priority: 2 },
      { role: "Sales Manager", rationale: "GTM / pipeline", priority: 3 },
      { role: "Marketing Manager", rationale: "Demand gen", priority: 4 },
    ],
    hospitality: [
      { role: "Operations Manager", rationale: "Reserveringen & bezetting", priority: 2 },
      { role: "Marketing Manager", rationale: "Online bookings", priority: 3 },
    ],
  };

  const extra = byClass[businessClass ?? ""] ?? [
    { role: "Sales Manager", rationale: "Commerciële touchpoint", priority: 4 },
    { role: "IT Manager", rationale: "Digitale systemen", priority: 5 },
  ];

  return [...base, ...extra].slice(0, 6);
}
