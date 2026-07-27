"use server";

import {
  dismissAIInsightAction,
  requestAICampaignInsightAction,
} from "@/lib/email/ai/actions";

export async function requestAICampaignInsightFormAction(
  _formData?: FormData,
): Promise<void> {
  void _formData;
  await requestAICampaignInsightAction();
}

export async function dismissAIInsightFormAction(
  formData: FormData,
): Promise<void> {
  const insightId = String(formData.get("insightId") || "");
  if (!insightId) return;
  await dismissAIInsightAction(insightId);
}
