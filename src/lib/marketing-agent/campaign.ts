/**
 * Campaign builder — generate full campaign plans by type.
 */

import {
  MARKETING_CAMPAIGN_TYPE_LABELS,
  type MarketingCampaignType,
  type MarketingChannel,
} from "@/lib/marketing-agent/constants";
import type { CampaignPlan } from "@/lib/marketing-agent/types";

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

const TYPE_DEFAULTS: Record<
  MarketingCampaignType,
  {
    objective: string;
    audience: string;
    channel: MarketingChannel;
    steps: number;
    cadenceDays: number;
    ctas: string[];
  }
> = {
  product_launch: {
    objective: "Introduceer het product en genereer geïnteresseerde leads",
    audience: "Warme leads + hot prospects",
    channel: "multi",
    steps: 4,
    cadenceDays: 3,
    ctas: ["Bekijk product", "Plan demo", "Download brochure"],
  },
  lead_nurturing: {
    objective: "Warm leads op met waardevolle content tot sales-handoff",
    audience: "Nieuwe en warme leads",
    channel: "email",
    steps: 5,
    cadenceDays: 3,
    ctas: ["Lees meer", "Bekijk case", "Plan gesprek"],
  },
  cold_outreach: {
    objective: "Open gesprekken met nieuwe prospects",
    audience: "Nieuwe leads zonder recente activiteit",
    channel: "email",
    steps: 3,
    cadenceDays: 4,
    ctas: ["Korte call plannen", "Meer info"],
  },
  re_engagement: {
    objective: "Heractiveer inactieve contacten",
    audience: "Inactieve klanten / lage activiteit",
    channel: "email",
    steps: 3,
    cadenceDays: 5,
    ctas: ["Update voorkeuren", "Bekijk nieuw"],
  },
  newsletter: {
    objective: "Bouw engagement met periodieke updates",
    audience: "Alle geabonneerde contacten",
    channel: "email",
    steps: 1,
    cadenceDays: 14,
    ctas: ["Lees artikel", "Deel feedback"],
  },
  event: {
    objective: "Maximaliseer event-registraties en opkomst",
    audience: "Warme leads + VIP",
    channel: "multi",
    steps: 4,
    cadenceDays: 2,
    ctas: ["Registreer", "Add to calendar", "Uitnodig collega"],
  },
  promotion: {
    objective: "Drijf conversie op een tijdelijke actie",
    audience: "Hoog omzetpotentieel + warme leads",
    channel: "email",
    steps: 3,
    cadenceDays: 2,
    ctas: ["Claim aanbieding", "Bekijk voorwaarden"],
  },
  upsell: {
    objective: "Bied upgrades aan bestaande klanten",
    audience: "Trouwe klanten",
    channel: "email",
    steps: 3,
    cadenceDays: 4,
    ctas: ["Upgrade bekijken", "Praat met accountmanager"],
  },
  cross_sell: {
    objective: "Introduceer aanvullende producten/modules",
    audience: "Nieuwe en trouwe klanten",
    channel: "email",
    steps: 3,
    cadenceDays: 5,
    ctas: ["Ontdek module", "Plan walkthrough"],
  },
  renewal: {
    objective: "Verhoog renewals vóór contracteinddatum",
    audience: "Klanten met naderende renewals",
    channel: "email",
    steps: 4,
    cadenceDays: 7,
    ctas: ["Renew nu", "Plan review"],
  },
  custom: {
    objective: "Maatwerk marketingdoel",
    audience: "Geselecteerd segment",
    channel: "email",
    steps: 3,
    cadenceDays: 3,
    ctas: ["Meer informatie", "Contact"],
  },
};

export function buildCampaignPlan(params: {
  campaignType: MarketingCampaignType;
  topic?: string | null;
  brandVoice?: string | null;
  companyHint?: string | null;
}): CampaignPlan {
  const defaults = TYPE_DEFAULTS[params.campaignType];
  const topic = params.topic?.trim() || MARKETING_CAMPAIGN_TYPE_LABELS[params.campaignType];
  const voice = params.brandVoice?.trim() || "professional";
  const who = params.companyHint?.trim() || "jullie team";

  const subjects = [
    `${topic}: klaar voor de volgende stap?`,
    `Voor ${who}: ${topic}`,
    `${topic} — praktische tip in 2 minuten`,
  ];

  const emails = Array.from({ length: defaults.steps }, (_, i) => {
    const step = i + 1;
    const subject = subjects[i % subjects.length]!;
    const cta = defaults.ctas[i % defaults.ctas.length]!;
    return {
      subject: step === 1 ? subject : `Follow-up ${step}: ${topic}`,
      preview: `${topic} — stap ${step} van ${defaults.steps}`,
      body: [
        `Beste {{first_name}},`,
        ``,
        `Dit is stap ${step} van onze ${MARKETING_CAMPAIGN_TYPE_LABELS[params.campaignType].toLowerCase()}-campagne over ${topic}.`,
        `We houden de toon ${voice} en focussen op concrete waarde voor ${who}.`,
        ``,
        `CTA: ${cta}`,
        ``,
        `Met vriendelijke groet,`,
        `{{sender_name}}`,
      ].join("\n"),
      cta,
    };
  });

  const followUps = [
    "Herinnering na non-open binnen 3 dagen",
    "Sales taak als CTA-klik zonder reply",
    "Stop nurture bij sales handoff of unsubscribe",
  ];

  const successCriteria = [
    "Open rate ≥ 25%",
    "Click rate ≥ 4%",
    "Meetbare lead/MQA groei of pipeline impact",
    "Geen bounce spike > 2%",
  ];

  const aiScore = clamp(
    55 +
      defaults.steps * 4 +
      (params.topic?.trim() ? 8 : 0) +
      (params.companyHint?.trim() ? 5 : 0),
  );

  return {
    name: `${MARKETING_CAMPAIGN_TYPE_LABELS[params.campaignType]} — ${topic}`,
    campaignType: params.campaignType,
    objective: defaults.objective,
    audience: defaults.audience,
    channel: defaults.channel,
    schedule: {
      startOffsetDays: 0,
      cadenceDays: defaults.cadenceDays,
      steps: defaults.steps,
    },
    emails,
    ctas: defaults.ctas,
    subjects,
    followUps,
    successCriteria,
    aiScore,
  };
}

export function scoreCampaignPlan(plan: CampaignPlan): number {
  let score = plan.aiScore;
  if (plan.emails.length >= 3) score += 5;
  if (plan.ctas.length >= 2) score += 3;
  if (plan.successCriteria.length >= 3) score += 4;
  return clamp(score);
}
