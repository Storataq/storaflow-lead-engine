/**
 * Client-safe memory ranking helpers.
 */

export function rankMemoryRelevance(content: string, query: string): number {
  if (!query.trim()) return 0;
  const tokenize = (text: string) =>
    text
      .toLowerCase()
      .split(/[^a-z0-9àáäâèéëêìíïîòóöôùúüûñç]+/i)
      .filter((t) => t.length > 2);
  const q = new Set(tokenize(query));
  const c = tokenize(content);
  if (q.size === 0 || c.length === 0) return 0;
  let hits = 0;
  for (const token of c) {
    if (q.has(token)) hits += 1;
  }
  return Math.round((hits / Math.max(q.size, 1)) * 1000) / 1000;
}

export function summarizeMemory(content: string, maxLen = 240): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1)}…`;
}
