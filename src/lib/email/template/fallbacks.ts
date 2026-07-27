import type { Json } from "@/types/supabase";

export function asFallbacks(value: Json): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string") out[key] = raw;
  }
  return out;
}

export function mapTemplateFallbacks(fallbacksJson: Json): Record<string, string> {
  return asFallbacks(fallbacksJson);
}
