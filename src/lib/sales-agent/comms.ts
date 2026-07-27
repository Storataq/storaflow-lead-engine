/**
 * Email templates + meeting brief/summary helpers.
 */

import {
  EMAIL_TEMPLATE_LABELS,
  EMAIL_TEMPLATE_TYPES,
  type EmailTemplateType,
} from "@/lib/sales-agent/constants";
import type { DealAnalysisResult, DealSignalInput } from "@/lib/sales-agent/types";

export function generateEmailDraft(params: {
  type: EmailTemplateType;
  dealTitle: string;
  companyName?: string | null;
  contactName?: string | null;
  value?: number | null;
}): { subject: string; body: string } {
  const who = params.contactName?.trim() || "daar";
  const company = params.companyName?.trim() || params.dealTitle;
  const valueBit =
    params.value && params.value > 0
      ? ` (indicatie €${Math.round(params.value).toLocaleString("nl-NL")})`
      : "";

  const bodies: Record<EmailTemplateType, { subject: string; body: string }> = {
    introduction: {
      subject: `Kennismaking — ${company}`,
      body: `Beste ${who},\n\nGraag stel ik Storaflow kort voor in het kader van ${params.dealTitle}${valueBit}.\nWe helpen teams pipeline, opvolging en forecasting strakker te maken.\n\nZou je openstaan voor een korte call deze week?\n\nMet vriendelijke groet`,
    },
    follow_up: {
      subject: `Follow-up: ${params.dealTitle}`,
      body: `Beste ${who},\n\nIk wilde even checken of je mijn vorige bericht over ${company} hebt kunnen bekijken.\nHeb je nog vragen of zal ik een voorstel/demo inplannen?\n\nMet vriendelijke groet`,
    },
    thank_you: {
      subject: `Bedankt voor het gesprek — ${company}`,
      body: `Beste ${who},\n\nDank voor je tijd vandaag rond ${params.dealTitle}.\nHieronder de afgesproken next steps — laat me weten als ik iets moet aanpassen.\n\nMet vriendelijke groet`,
    },
    quote: {
      subject: `Offerte — ${params.dealTitle}`,
      body: `Beste ${who},\n\nZoals besproken stuur ik de offerte voor ${company}${valueBit}.\nIk licht de aannames graag toe en plan een short review in.\n\nMet vriendelijke groet`,
    },
    reminder: {
      subject: `Herinnering: openstaand punt — ${params.dealTitle}`,
      body: `Beste ${who},\n\nKleine reminder over ${params.dealTitle}.\nLaat je weten wat de status is, of zal ik een nieuw voorstel sturen?\n\nMet vriendelijke groet`,
    },
    demo_invite: {
      subject: `Demo uitnodiging — ${company}`,
      body: `Beste ${who},\n\nGraag nodig ik je uit voor een demo gericht op ${params.dealTitle}.\nWelke van deze twee slots past: morgen 10:00 of donderdag 14:00?\n\nMet vriendelijke groet`,
    },
    contract: {
      subject: `Contract — ${params.dealTitle}`,
      body: `Beste ${who},\n\nHierbij het contract/voorstel voor ${company}.\nLaat me weten als er nog wijzigingen nodig zijn vóór ondertekening.\n\nMet vriendelijke groet`,
    },
    rejection: {
      subject: `Terugkoppeling — ${params.dealTitle}`,
      body: `Beste ${who},\n\nDank voor je openheid over ${params.dealTitle}.\nWe respecteren jullie keuze en blijven beschikbaar als prioriteiten wijzigen.\n\nMet vriendelijke groet`,
    },
    upsell: {
      subject: `Uitbreiding voor ${company}`,
      body: `Beste ${who},\n\nOp basis van jullie huidige gebruik rond ${params.dealTitle} zie ik ruimte voor een upgrade/uitbreiding.\nZal ik een korte impact-overzicht sturen?\n\nMet vriendelijke groet`,
    },
    cross_sell: {
      subject: `Aanvullende module voor ${company}`,
      body: `Beste ${who},\n\nNaast ${params.dealTitle} kan een aanvullende Storaflow-module jullie workflow versnellen.\nIk deel graag 2 concrete use cases.\n\nMet vriendelijke groet`,
    },
  };

  return bodies[params.type];
}

export function buildMeetingBrief(params: {
  deal: DealSignalInput;
  analysis: DealAnalysisResult;
  companyName?: string | null;
  notes?: string[];
}): Record<string, unknown> {
  return {
    companyOverview: params.companyName ?? params.deal.title,
    deal: {
      title: params.deal.title,
      value: params.deal.value,
      status: params.deal.status,
      stage: params.deal.stageName,
      probability: params.analysis.closingProbability,
      risk: params.analysis.riskLevel,
    },
    contactHistory: {
      daysSinceLastActivity: params.deal.daysSinceLastActivity,
      noteCount: params.deal.noteCount,
      openTasks: params.deal.openTasks,
    },
    previousNotes: (params.notes ?? []).slice(0, 5),
    focusPoints: params.analysis.obstacles.slice(0, 5),
    meetingGoal: `Vooruitgang boeken op ${params.deal.title} — next step: ${params.analysis.nextBestAction}`,
    questionsToAsk: [
      "Wat is de interne beslissingsdeadline?",
      "Wie moet nog akkoord geven?",
      "Welke risico's of concurrenten spelen?",
      "Wat zou een succesvolle uitkomst deze maand zijn?",
    ],
    possibleObjections: [
      "Budget timing",
      "Interne prioriteiten",
      "Concurrentaanbod",
      "Implementatiecapaciteit",
    ],
    recommendedSolutions: params.analysis.coachTips.slice(0, 4),
  };
}

export function buildMeetingSummary(params: {
  dealTitle: string;
  notes: string;
  analysis: DealAnalysisResult;
}): Record<string, unknown> {
  const lines = params.notes
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    summary:
      lines.slice(0, 8).join(" ") ||
      `Gesprek over ${params.dealTitle} afgerond.`,
    actionItems: [
      `Voer uit: ${params.analysis.nextBestAction}`,
      ...params.analysis.missedActivities.map((m) => `Herstel: ${m}`),
    ].slice(0, 6),
    newTasks: [
      {
        title: `Follow-up ${params.dealTitle}`,
        priority:
          params.analysis.riskLevel === "high" ||
          params.analysis.riskLevel === "critical"
            ? "high"
            : "normal",
      },
    ],
    opportunities: params.analysis.opportunities,
    risks: params.analysis.obstacles,
    nextStep: params.analysis.nextBestAction,
    crmUpdate: {
      probability: Math.round(params.analysis.closingProbability * 100),
      expectedCloseDate: params.analysis.predictedCloseDate,
      riskLevel: params.analysis.riskLevel,
    },
  };
}

export function emailTemplateOptions() {
  return EMAIL_TEMPLATE_TYPES.map((t) => ({
    value: t,
    label: EMAIL_TEMPLATE_LABELS[t],
  }));
}
