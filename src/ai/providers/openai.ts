/**
 * OpenAI chat completions adapter for the AI kernel.
 */

import OpenAI from "openai";

import type { AiProviderAdapter, ModelCompletionRequest } from "@/ai/types";
import { estimateCostUsd } from "@/ai/providers/costs";

export class OpenAIKernelProvider implements AiProviderAdapter {
  readonly code = "openai" as const;
  private client: OpenAI | null = null;

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const key = process.env.OPENAI_API_KEY?.trim();
      if (!key) {
        throw Object.assign(new Error("OPENAI_API_KEY is not configured."), {
          code: "provider_auth",
          retryable: false,
        });
      }
      this.client = new OpenAI({ apiKey: key });
    }
    return this.client;
  }

  async complete(request: ModelCompletionRequest) {
    const started = Date.now();
    const timeoutMs = request.timeoutMs ?? 60_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const completion = await this.getClient().chat.completions.create(
        {
          model: request.model,
          temperature: request.temperature ?? 0.3,
          max_tokens: request.maxTokens ?? 4096,
          response_format:
            request.responseFormat === "json"
              ? { type: "json_object" }
              : undefined,
          messages: [
            { role: "system", content: request.system },
            { role: "user", content: request.user },
          ],
        },
        { signal: controller.signal },
      );

      const content = completion.choices[0]?.message?.content ?? "";
      const inputTokens = completion.usage?.prompt_tokens ?? 0;
      const outputTokens = completion.usage?.completion_tokens ?? 0;
      const model = completion.model ?? request.model;

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
