/**
 * Prospect export helpers (CSV / JSON / PDF text / Excel-compatible CSV).
 */

import type { ProspectingProspectRow } from "@/lib/prospecting/types";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function prospectsToCsv(rows: ProspectingProspectRow[]): string {
  const headers = [
    "id",
    "company_name",
    "website_url",
    "industry",
    "business_class",
    "country",
    "region",
    "city",
    "employee_band",
    "lead_score",
    "lead_quality",
    "ai_confidence",
    "recommendation",
    "status",
    "email",
    "phone",
    "company_id",
    "created_at",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.company_name,
        row.website_url,
        row.industry,
        row.business_class,
        row.country,
        row.region,
        row.city,
        row.employee_band,
        row.lead_score,
        row.lead_quality,
        row.ai_confidence,
        row.recommendation,
        row.status,
        row.email,
        row.phone,
        row.company_id,
        row.created_at,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function prospectsToJson(rows: ProspectingProspectRow[]): string {
  return JSON.stringify(rows, null, 2);
}

/** Minimal text PDF-compatible report (no binary dependency). */
export function prospectsToPdfText(rows: ProspectingProspectRow[]): string {
  const lines = [
    "Storaflow AI Prospecting Export",
    `Generated: ${new Date().toISOString()}`,
    `Count: ${rows.length}`,
    "",
  ];
  for (const row of rows) {
    lines.push(
      `${row.company_name} | score ${row.lead_score} (${row.lead_quality}) | ${row.recommendation}`,
    );
    lines.push(
      `  ${row.website_url ?? "—"} | ${row.country ?? "—"} / ${row.city ?? "—"}`,
    );
    lines.push(`  ${row.research_summary?.slice(0, 200) ?? "—"}`);
    lines.push("");
  }
  return lines.join("\n");
}

/** Excel opens UTF-8 CSV with BOM reliably. */
export function prospectsToExcelCsv(rows: ProspectingProspectRow[]): string {
  return `\uFEFF${prospectsToCsv(rows)}`;
}
