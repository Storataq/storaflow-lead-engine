/**
 * Onboarding + success plan builders.
 */

import type {
  CustomerSignalInput,
  OnboardingResult,
  SuccessMilestone,
} from "@/lib/customer-success/types";

export function buildOnboardingChecklist(
  signal: CustomerSignalInput,
): OnboardingResult {
  const items = [
    {
      id: "profile",
      label: "Profiel compleet",
      done: Boolean(signal.companyName && (signal.industry || signal.country)),
    },
    {
      id: "users",
      label: "Gebruikers / contacten toegevoegd",
      done: signal.contactCount >= 1,
    },
    {
      id: "first_login",
      label: "Eerste activiteit / login",
      done: signal.daysSinceActivity <= 14 || signal.noteCount > 0,
    },
    {
      id: "data_import",
      label: "Data geïmporteerd (deals/notes)",
      done: signal.wonDealValue + signal.openDealValue > 0 || signal.noteCount >= 2,
    },
    {
      id: "integrations",
      label: "Integraties actief",
      done: (signal.intelligenceScore ?? 0) > 0,
    },
    {
      id: "first_workflow",
      label: "Eerste workflow / taken",
      done: signal.openTasks + signal.overdueTasks > 0 || signal.noteCount > 0,
    },
    {
      id: "ai_copilot",
      label: "AI Copilot / intelligence gebruikt",
      done: (signal.intelligenceScore ?? 0) >= 40,
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const progressPercent = Math.round((doneCount / items.length) * 100);
  const daysOld = Math.floor(
    (Date.now() - new Date(signal.createdAt).getTime()) / (24 * 60 * 60 * 1000),
  );

  let status: OnboardingResult["status"] = "in_progress";
  if (progressPercent === 0) status = "not_started";
  else if (progressPercent === 100) status = "completed";
  else if (daysOld > 45 && progressPercent < 70) status = "stalled";

  return { items, progressPercent, status };
}

export function buildSuccessPlan(params: {
  companyName: string;
  healthScore: number;
  onboardingProgress: number;
}): SuccessMilestone[] {
  return [
    {
      id: "w1",
      weekLabel: "Week 1",
      title: "Onboarding",
      description: `Kick-off voor ${params.companyName}: profiel, users, eerste login.`,
      done: params.onboardingProgress >= 30,
    },
    {
      id: "w2",
      weekLabel: "Week 2",
      title: "Training",
      description: "Feature training + adoption checklist.",
      done: params.onboardingProgress >= 55,
    },
    {
      id: "w3",
      weekLabel: "Week 3",
      title: "Optimalisatie",
      description: "Workflows, integraties, health baseline.",
      done: params.onboardingProgress >= 75 && params.healthScore >= 50,
    },
    {
      id: "m2",
      weekLabel: "Maand 2",
      title: "Review",
      description: "Success review + ROI inzichten.",
      done: params.healthScore >= 70,
    },
    {
      id: "m3",
      weekLabel: "Maand 3",
      title: "Upsell analyse",
      description: "Seats, modules, enterprise/API kansen.",
      done: params.healthScore >= 80,
    },
  ];
}
