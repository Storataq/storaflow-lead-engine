/**
 * Estimate realtime AI cost from token usage.
 */

import { MODEL_COST_PER_1K } from "@/ai/constants";

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates =
    MODEL_COST_PER_1K[model] ??
    Object.entries(MODEL_COST_PER_1K).find(([key]) =>
      model.toLowerCase().includes(key.toLowerCase()),
    )?.[1] ?? { input: 0.001, output: 0.003 };

  const usd =
    (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
  return Math.round(usd * 1e6) / 1e6;
}
