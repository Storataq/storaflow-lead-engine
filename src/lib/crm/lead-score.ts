import type { CrmLeadWithRelations } from "@/lib/crm/queries";

export type LeadTemperature = "hot" | "warm" | "cold" | "qualified";

export type LeadScoreBreakdown = {
  score: number;
  temperature: LeadTemperature;
  color: "green" | "orange" | "red";
  factors: { label: string; points: number; active: boolean }[];
};

/**
 * Dummy lead score for UI only — no AI / enrichment APIs.
 */
export function computeLeadScore(
  lead: Pick<
    CrmLeadWithRelations,
    | "website"
    | "email"
    | "phone"
    | "lead_score"
    | "status"
    | "updated_at"
    | "industry"
    | "stage"
  > & {
    linkedinUrl?: string | null;
    companySize?: string | null;
  },
): LeadScoreBreakdown {
  const factors = [
    {
      label: "Website aanwezig",
      points: 15,
      active: Boolean(lead.website?.trim()),
    },
    {
      label: "E-mail aanwezig",
      points: 20,
      active: Boolean(lead.email?.trim()),
    },
    {
      label: "Telefoon aanwezig",
      points: 15,
      active: Boolean(lead.phone?.trim()),
    },
    {
      label: "LinkedIn aanwezig",
      points: 15,
      active: Boolean(lead.linkedinUrl?.trim()),
    },
    {
      label: "Bedrijfsgrootte bekend",
      points: 10,
      active: Boolean(lead.companySize?.trim()),
    },
    {
      label: "Branche bekend",
      points: 10,
      active: Boolean(lead.industry?.trim()),
    },
    {
      label: "Recente activiteit (7d)",
      points: 15,
      active:
        Date.now() - new Date(lead.updated_at).getTime() <
        7 * 24 * 60 * 60 * 1000,
    },
  ];

  const computed = factors.reduce(
    (sum, factor) => sum + (factor.active ? factor.points : 0),
    0,
  );
  const score = Math.min(
    100,
    Math.max(computed, Number(lead.lead_score) || 0),
  );

  const stageSlug = lead.stage?.slug ?? "";
  const qualified =
    stageSlug.includes("gekwalificeerd") ||
    stageSlug.includes("qualified") ||
    lead.status === "won";

  let temperature: LeadTemperature = "cold";
  if (qualified) temperature = "qualified";
  else if (score >= 75) temperature = "hot";
  else if (score >= 45) temperature = "warm";

  const color: LeadScoreBreakdown["color"] =
    score >= 70 ? "green" : score >= 40 ? "orange" : "red";

  return { score, temperature, color, factors };
}

export function temperatureLabel(value: LeadTemperature): string {
  switch (value) {
    case "hot":
      return "Hot";
    case "warm":
      return "Warm";
    case "qualified":
      return "Qualified";
    default:
      return "Cold";
  }
}
