/**
 * Lightweight evaluation helpers for agent outputs.
 */

export function scoreGrounding(
  output: string,
  evidenceSnippets: string[],
): number {
  if (!output.trim()) return 0;
  if (evidenceSnippets.length === 0) return 0.5;
  const lower = output.toLowerCase();
  let hits = 0;
  for (const snip of evidenceSnippets) {
    const token = snip.toLowerCase().slice(0, 40).trim();
    if (token.length > 4 && lower.includes(token.slice(0, 20))) hits += 1;
  }
  return Math.min(1, hits / Math.max(1, evidenceSnippets.length));
}

export function detectHallucinationRisk(
  output: string,
  flags: string[],
): number {
  let risk = 0;
  if (/as an ai language model/i.test(output)) risk += 0.1;
  if (/certainly!|absolutely!/i.test(output) && output.length < 80) risk += 0.2;
  if (flags.includes("prompt_injection_signal")) risk += 0.5;
  return Math.min(1, risk);
}
