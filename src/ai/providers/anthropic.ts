/**
 * Anthropic Messages API adapter (HTTP).
 */

import type { AiProviderAdapter, ModelCompletionRequest } from "@/ai/types";
import { estimateCostUsd } from "@/ai/providers/costs";

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  model?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};

export class AnthropicKernelProvider implements AiProviderAdapter {
  readonly code = "anthropic" as const;

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  }

  async complete(request: ModelCompletionRequest) {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw Object.assign(new Error("ANTHROPIC_API_KEY is not configured."), {
        code: "provider_auth",
        retryable: false,
      });
    }

    const started = Date.now();
    const timeoutMs = request.timeoutMs ?? 60_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: request.model || "claude-3-5-haiku-latest",
          max_tokens: request.maxTokens ?? 4096,
          temperature: request.temperature ?? 0.3,
          system: request.system,
          messages: [{ role: "user", content: request.user }],
        }),
        signal: controller.signal,
      });

      const json = (await response.json()) as AnthropicResponse;
      if (!response.ok) {
        throw Object.assign(
          new Error(json.error?.message ?? `Anthropic HTTP ${response.status}`),
          {
            code: response.status === 429 ? "rate_limit" : "provider_error",
            retryable: response.status === 429 || response.status >= 500,
          },
        );
      }

      const content =
        json.content
          ?.filter((block) => block.type === "text")
          .map((block) => block.text ?? "")
          .join("\n") ?? "";
      const inputTokens = json.usage?.input_tokens ?? 0;
      const outputTokens = json.usage?.output_tokens ?? 0;
      const model = json.model ?? request.model;

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
