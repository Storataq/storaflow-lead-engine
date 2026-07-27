/**
 * Cost optimization + failure recovery helpers.
 */

import type { CostStrategy } from "@/lib/orchestrator/constants";

export type ModelChoice = {
  provider: string;
  model: string;
  estimatedCostPer1k: number;
  latencyScore: number;
  qualityScore: number;
};

const MODEL_CATALOG: ModelChoice[] = [
  {
    provider: "openai",
    model: "gpt-4.1-mini",
    estimatedCostPer1k: 0.0004,
    latencyScore: 90,
    qualityScore: 80,
  },
  {
    provider: "openai",
    model: "gpt-4.1",
    estimatedCostPer1k: 0.005,
    latencyScore: 70,
    qualityScore: 95,
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4",
    estimatedCostPer1k: 0.003,
    latencyScore: 75,
    qualityScore: 93,
  },
  {
    provider: "google",
    model: "gemini-2.0-flash",
    estimatedCostPer1k: 0.0002,
    latencyScore: 95,
    qualityScore: 72,
  },
];

export function pickModel(
  strategy: CostStrategy,
  providerPriority: string[] = ["openai", "anthropic", "google"],
): ModelChoice {
  const ordered = [...MODEL_CATALOG].sort((a, b) => {
    const pa = providerPriority.indexOf(a.provider);
    const pb = providerPriority.indexOf(b.provider);
    const priA = pa === -1 ? 99 : pa;
    const priB = pb === -1 ? 99 : pb;
    if (priA !== priB) return priA - priB;
    return 0;
  });

  if (strategy === "cheapest") {
    return [...ordered].sort(
      (a, b) => a.estimatedCostPer1k - b.estimatedCostPer1k,
    )[0];
  }
  if (strategy === "fastest") {
    return [...ordered].sort((a, b) => b.latencyScore - a.latencyScore)[0];
  }
  if (strategy === "best") {
    return [...ordered].sort((a, b) => b.qualityScore - a.qualityScore)[0];
  }
  // balanced: quality / cost
  return [...ordered].sort(
    (a, b) =>
      b.qualityScore / (a.estimatedCostPer1k + 0.0001) -
      a.qualityScore / (b.estimatedCostPer1k + 0.0001),
  )[0];
}

export function estimateTokensCost(
  tokens: number,
  choice: ModelChoice,
): number {
  return Math.round((tokens / 1000) * choice.estimatedCostPer1k * 10000) / 10000;
}

export type RecoveryAction =
  | { type: "retry"; attempt: number }
  | { type: "fallback_model"; provider: string; model: string }
  | { type: "alternate_agent"; agentSlug: string }
  | { type: "partial_recovery" }
  | { type: "abort"; reason: string };

export function decideRecovery(params: {
  attempt: number;
  maxAttempts: number;
  agentSlug: string;
  provider: string;
  model: string;
}): RecoveryAction {
  const { attempt, maxAttempts, agentSlug, provider, model } = params;
  if (attempt < maxAttempts) {
    return { type: "retry", attempt: attempt + 1 };
  }
  // Alternate provider/model
  const alt = pickModel("cheapest", ["google", "openai", "anthropic"]);
  if (alt.provider !== provider || alt.model !== model) {
    return {
      type: "fallback_model",
      provider: alt.provider,
      model: alt.model,
    };
  }
  // Alternate agent → kernel copilot
  if (!agentSlug.includes("kernel")) {
    return {
      type: "alternate_agent",
      agentSlug: "storaflow-kernel-assistant",
    };
  }
  return { type: "partial_recovery" };
}

export function shouldRequireApproval(params: {
  policy: string;
  stepApprovalRequired: boolean;
  estimatedCostUsd: number;
  costLimitUsd: number;
}): boolean {
  const { policy, stepApprovalRequired, estimatedCostUsd, costLimitUsd } =
    params;
  if (policy === "auto" || policy === "fully_autonomous") return false;
  if (policy === "critical") return true;
  if (policy === "manual" || policy === "approval_required") return true;
  if (policy === "multi" || policy === "workflow") return stepApprovalRequired;
  // semi_autonomous
  if (stepApprovalRequired) return true;
  if (estimatedCostUsd > costLimitUsd * 0.5) return true;
  return false;
}
