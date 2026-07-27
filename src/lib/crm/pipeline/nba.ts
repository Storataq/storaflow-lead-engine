/**
 * Deterministic Next Best Action suggestions for deals (AI-ready).
 */

export type DealNbaItem = {
  id: string;
  action: string;
  priority: "high" | "medium" | "low";
  rationale: string;
};

export function buildDealNextBestActions(input: {
  status: string;
  probability: number;
  value: number;
  daysInStage: number | null;
  hasExpectedClose: boolean;
  expectedClosePast: boolean;
  hasPrimaryContact: boolean;
  openTaskCount: number;
}): DealNbaItem[] {
  const items: DealNbaItem[] = [];

  if (input.status === "won") {
    return [
      {
        id: "won-handoff",
        action: "Start onboarding / handoff",
        priority: "medium",
        rationale: "Deal is won — move to customer success workflow",
      },
    ];
  }

  if (input.status === "lost") {
    return [
      {
        id: "lost-review",
        action: "Review lost reason with team",
        priority: "low",
        rationale: "Capture learning for win-rate improvement",
      },
    ];
  }

  if (input.expectedClosePast) {
    items.push({
      id: "close-date",
      action: "Update expected close date",
      priority: "high",
      rationale: "Expected close date is in the past",
    });
  }

  if ((input.daysInStage ?? 0) >= 14) {
    items.push({
      id: "stale",
      action: "Follow up — deal inactive in stage",
      priority: "high",
      rationale: "No stage movement for 14+ days",
    });
  }

  if (input.probability >= 60 && input.value >= 5000) {
    items.push({
      id: "proposal",
      action: "Send proposal",
      priority: "high",
      rationale: "High probability + material deal value",
    });
  }

  if (input.probability >= 40 && input.probability < 60) {
    items.push({
      id: "meeting",
      action: "Schedule meeting",
      priority: "medium",
      rationale: "Mid-funnel deals convert better with live discovery",
    });
  }

  if (!input.hasPrimaryContact) {
    items.push({
      id: "contact",
      action: "Assign primary contact",
      priority: "medium",
      rationale: "Missing decision-maker / primary contact",
    });
  }

  if (input.openTaskCount === 0) {
    items.push({
      id: "task",
      action: "Create follow-up task",
      priority: "medium",
      rationale: "No open tasks on this deal",
    });
  }

  if (input.probability >= 80) {
    items.push({
      id: "close",
      action: "Close deal",
      priority: "high",
      rationale: "Win probability is very high — push to close",
    });
  } else if (input.probability < 25) {
    items.push({
      id: "wait",
      action: "Wait 5 days / nurture",
      priority: "low",
      rationale: "Low probability — avoid over-investing",
    });
  }

  if (input.value >= 25000) {
    items.push({
      id: "escalate",
      action: "Escalate large opportunity",
      priority: "high",
      rationale: "Deal value is large — involve senior owner",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "call",
      action: "Call today",
      priority: "medium",
      rationale: "Default outreach to keep momentum",
    });
  }

  return items.slice(0, 6);
}

/** Server helper: derive NBA inputs from deal timestamps (keeps pages pure). */
export function buildDealNextBestActionsForDeal(input: {
  status: string;
  probability: number;
  value: number;
  createdAt: string;
  lastStageChangedAt: string | null;
  expectedCloseDate: string | null;
  hasPrimaryContact: boolean;
  openTaskCount: number;
}): DealNbaItem[] {
  const now = Date.now();
  const stageAnchor = input.lastStageChangedAt ?? input.createdAt;
  const daysInStage = Math.floor(
    (now - new Date(stageAnchor).getTime()) / (1000 * 60 * 60 * 24),
  );
  const expectedClosePast = Boolean(
    input.expectedCloseDate &&
      new Date(input.expectedCloseDate).getTime() < now &&
      input.status === "open",
  );

  return buildDealNextBestActions({
    status: input.status,
    probability: input.probability,
    value: input.value,
    daysInStage,
    hasExpectedClose: Boolean(input.expectedCloseDate),
    expectedClosePast,
    hasPrimaryContact: input.hasPrimaryContact,
    openTaskCount: input.openTaskCount,
  });
}
