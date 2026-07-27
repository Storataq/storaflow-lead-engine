/**
 * Result merging, conflict resolution, executive summary.
 */

import type { MergedResult, TaskResult } from "@/lib/orchestrator/types";

function uniquePreserveOrder(items: string[]): { list: string[]; removed: number } {
  const seen = new Set<string>();
  const list: string[] = [];
  let removed = 0;
  for (const raw of items) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) {
      removed += 1;
      continue;
    }
    seen.add(key);
    list.push(raw.trim());
  }
  return { list, removed };
}

/** Detect contradictory pairs (e.g. "MRR stijgt" vs "MRR daalt"). */
function resolveConflicts(items: string[]): { list: string[]; resolved: number } {
  const drop = new Set<number>();
  let resolved = 0;
  const lower = items.map((i) => i.toLowerCase());
  for (let i = 0; i < items.length; i++) {
    if (drop.has(i)) continue;
    for (let j = i + 1; j < items.length; j++) {
      if (drop.has(j)) continue;
      const a = lower[i];
      const b = lower[j];
      const opposite =
        (a.includes("stijgt") && b.includes("daalt")) ||
        (a.includes("daalt") && b.includes("stijgt")) ||
        (a.includes("groeit") && b.includes("krimpt")) ||
        (a.includes("hoog") && b.includes("laag") && shareTopic(a, b));
      if (opposite) {
        // Prefer later (more recent) agent output
        drop.add(i);
        resolved += 1;
        break;
      }
    }
  }
  return {
    list: items.filter((_, idx) => !drop.has(idx)),
    resolved,
  };
}

function shareTopic(a: string, b: string): boolean {
  const topics = ["mrr", "arr", "pipeline", "churn", "omzet", "conversie"];
  return topics.some((t) => a.includes(t) && b.includes(t));
}

export function mergeTaskResults(
  goalText: string,
  results: TaskResult[],
): MergedResult {
  const completed = results.filter((r) => r.status === "completed");
  const failed = results.filter((r) => r.status === "failed");

  const insightsRaw = completed.flatMap((r) => r.insights);
  const recsRaw = completed.flatMap((r) => r.recommendations);
  const risksRaw = completed.flatMap((r) => r.risks);
  const actionsRaw = completed.flatMap((r) => r.actionItems);

  const insightsU = uniquePreserveOrder(insightsRaw);
  const recsU = uniquePreserveOrder(recsRaw);
  const risksU = uniquePreserveOrder(risksRaw);
  const actionsU = uniquePreserveOrder(actionsRaw);

  const insightsC = resolveConflicts(insightsU.list);
  const recsC = resolveConflicts(recsU.list);

  const duplicatesRemoved =
    insightsU.removed + recsU.removed + risksU.removed + actionsU.removed;
  const conflictsResolved = insightsC.resolved + recsC.resolved;

  const nextSteps = [
    ...actionsC(actionsU.list).slice(0, 5),
    ...(failed.length
      ? [`Herstart mislukte stappen (${failed.map((f) => f.agentSlug).join(", ")})`]
      : []),
  ];

  const agentLines = completed
    .map((r) => `- **${r.title}**: ${r.summary}`)
    .join("\n");

  const report = [
    `# Orchestrator eindrapport`,
    ``,
    `**Doel:** ${goalText}`,
    ``,
    `## Agent resultaten`,
    agentLines || "_Geen voltooide stappen._",
    ``,
    `## Inzichten`,
    ...insightsC.list.map((i) => `- ${i}`),
    ``,
    `## Aanbevelingen`,
    ...recsC.list.map((i) => `- ${i}`),
    ``,
    `## Risico's`,
    ...(risksU.list.length ? risksU.list.map((i) => `- ${i}`) : ["- Geen kritieke risico's"]),
    ``,
    `## Actiepunten`,
    ...actionsU.list.map((i) => `- ${i}`),
    ``,
    `## Volgende stappen`,
    ...nextSteps.map((i) => `- ${i}`),
  ].join("\n");

  const executiveSummary = [
    `Doel: ${goalText}.`,
    `${completed.length}/${results.length} agents succesvol.`,
    insightsC.list[0] ? `Belangrijkste inzicht: ${insightsC.list[0]}.` : "",
    recsC.list[0] ? `Aanbeveling: ${recsC.list[0]}.` : "",
    failed.length ? `${failed.length} stap(pen) mislukt — partial recovery beschikbaar.` : "Workflow volledig afgerond.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    report,
    executiveSummary,
    insights: insightsC.list,
    recommendations: recsC.list,
    risks: risksU.list,
    actionItems: actionsU.list,
    nextSteps,
    conflictsResolved,
    duplicatesRemoved,
  };
}

function actionsC(list: string[]): string[] {
  return list;
}

/** Deterministic specialist output when invoking domain agents (no invented CRM rows). */
export function simulateAgentTask(params: {
  agentSlug: string;
  goalText: string;
  stepTitle: string;
  signals: {
    dealCount: number;
    openPipeline: number;
    customerCount: number;
    companyCount: number;
  };
}): TaskResult {
  const { agentSlug, goalText, stepTitle, signals } = params;
  const base = {
    stepKey: "",
    agentSlug,
    title: stepTitle,
    status: "completed" as const,
    costUsd: 0.02,
    tokensUsed: 420,
    latencyMs: 1800,
    provider: "openai",
    model: "gpt-4.1-mini",
  };

  if (agentSlug.includes("prospecting")) {
    return {
      ...base,
      summary: `Prospecting-scan op basis van doel "${goalText}" — ${signals.companyCount} bedrijven in CRM-context.`,
      insights: [
        `${signals.companyCount} bedrijven beschikbaar voor filtering`,
        "DACH/NL segmenten zijn het meest actief in recente data",
      ],
      recommendations: [
        "Focus op Enterprise + Mid-market in geselecteerde regio",
        "Verrijk top-prospects vóór outreach",
      ],
      risks: ["Lijstkwaliteit daalt zonder enrichment"],
      actionItems: ["Start gerichte zoekopdracht", "Exporteer shortlist naar Sales"],
    };
  }
  if (agentSlug.includes("sales")) {
    return {
      ...base,
      summary: `Pipeline-analyse: ${signals.dealCount} deals, open pipeline €${Math.round(signals.openPipeline).toLocaleString("nl-NL")}.`,
      insights: [
        `Open pipeline €${Math.round(signals.openPipeline).toLocaleString("nl-NL")}`,
        `${signals.dealCount} actieve deals in CRM`,
      ],
      recommendations: [
        "Prioriteer deals met >60% kans deze week",
        "Plan follow-ups voor stagnerende stages",
      ],
      risks: signals.openPipeline < 10000 ? ["Pipeline te dun voor kwartaaldoel"] : [],
      actionItems: ["Update deal stages", "Bereid morgen meetings voor"],
    };
  }
  if (agentSlug.includes("marketing")) {
    return {
      ...base,
      summary: "Marketingcampagne-outline gegenereerd op basis van doelgroep en CRM-signalen.",
      insights: ["Segmentatie op branche + land verhoogt CTR"],
      recommendations: ["Lanceer nurture-sequentie voor warme leads"],
      risks: ["Lage conversie zonder A/B subject lines"],
      actionItems: ["Kies template", "Koppel audience uit Prospecting"],
    };
  }
  if (agentSlug.includes("customer-success")) {
    return {
      ...base,
      summary: `CS-scan: ${signals.customerCount} klanten — churn/upsell signalen geëvalueerd.`,
      insights: [`${signals.customerCount} klantaccounts in scope`],
      recommendations: ["Focus upsell op healthy accounts met lage seat-utilisatie"],
      risks: ["Churn-risico bij accounts zonder recente activiteit"],
      actionItems: ["Open success plans voor at-risk accounts"],
    };
  }
  if (agentSlug.includes("revenue")) {
    return {
      ...base,
      summary: "Revenue Intelligence: KPI's en forecast-horizon bijgewerkt vanuit deals/billing.",
      insights: [
        "MRR/ARR afgeleid uit won deals + subscriptions",
        `Pipeline gewogen tegen ${signals.dealCount} deals`,
      ],
      recommendations: ["Bewaak NRR en expansie deze maand"],
      risks: ["Forecastconfidence daalt bij dunne pipeline"],
      actionItems: ["Genereer CEO revenue report", "Review expansion opportunities"],
    };
  }
  return {
    ...base,
    summary: `Copilot samenvatting voor: ${goalText}`,
    insights: ["Multi-agent resultaten gecombineerd tot executive view"],
    recommendations: ["Deel rapport met management", "Zet actiepunten in taken"],
    risks: failedRisk(signals),
    actionItems: ["Review merged report", "Goedkeur vervolgstappen"],
  };
}

function failedRisk(signals: {
  dealCount: number;
  openPipeline: number;
  customerCount: number;
  companyCount: number;
}): string[] {
  if (
    signals.dealCount === 0 &&
    signals.customerCount === 0 &&
    signals.companyCount === 0
  ) {
    return ["Weinig CRM-data — resultaten zijn richtinggevend"];
  }
  return [];
}
