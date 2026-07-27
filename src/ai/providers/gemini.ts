/**
 * Google Gemini generateContent adapter (HTTP).
 */

import type { AiProviderAdapter, ModelCompletionRequest } from "@/ai/types";
import { estimateCostUsd } from "@/ai/providers/costs";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { message?: string };
};

export class GeminiKernelProvider implements AiProviderAdapter {
  readonly code = "gemini" as const;

  isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim());
  }

  async complete(request: ModelCompletionRequest) {
    const apiKey =
      process.env.GOOGLE_AI_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw Object.assign(
        new Error("GOOGLE_AI_API_KEY / GEMINI_API_KEY is not configured."),
        { code: "provider_auth", retryable: false },
      );
    }

    const model = request.model || "gemini-2.0-flash";
    const started = Date.now();
    const timeoutMs = request.timeoutMs ?? 60_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: "user", parts: [{ text: request.user }] }],
          generationConfig: {
            temperature: request.temperature ?? 0.3,
            maxOutputTokens: request.maxTokens ?? 4096,
            responseMimeType:
              request.responseFormat === "json"
                ? "application/json"
                : "text/plain",
          },
        }),
        signal: controller.signal,
      });

      const json = (await response.json()) as GeminiResponse;
      if (!response.ok) {
        throw Object.assign(
          new Error(json.error?.message ?? `Gemini HTTP ${response.status}`),
          {
            code: response.status === 429 ? "rate_limit" : "provider_error",
            retryable: response.status === 429 || response.status >= 500,
          },
        );
      }

      const content =
        json.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? "")
          .join("") ?? "";
      const inputTokens = json.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = json.usageMetadata?.candidatesTokenCount ?? 0;

      return {
        content,
        model,
        usage: {
          inputTokens,
          outputTokens,
          estimatedCostUsd: estimateCostUsd(model, inputTokens, outputTokens),
          latencyMs: Date.now() - started,
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
