/**
 * Phase 21K — OpenAI provider + registry (no UI direct calls).
 */

import OpenAI from "openai";

import { getAiProviderCode, getDefaultAiModel } from "@/lib/email/ai/constants";
import type {
  AIProvider,
  AIProviderCode,
  AIRequest,
  AIResponse,
} from "@/lib/email/ai/types";

function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  // Approximate USD placeholder rates; org cost settings may override later.
  const expensive = model.includes("gpt-4.1") && !model.includes("mini");
  const inRate = expensive ? 0.002 / 1000 : 0.0004 / 1000;
  const outRate = expensive ? 0.008 / 1000 : 0.0016 / 1000;
  return Math.round((inputTokens * inRate + outputTokens * outRate) * 1e6) / 1e6;
}

export class DisabledAIProvider implements AIProvider {
  readonly code: AIProviderCode = "none";

  isConfigured(): boolean {
    return false;
  }

  async complete(_request: AIRequest): Promise<AIResponse> {
    void _request;
    throw Object.assign(new Error("AI is disabled or not configured."), {
      code: "ai_disabled",
      class: "user_correctable",
      retryable: false,
    });
  }
}

export class OpenAIEmailProvider implements AIProvider {
  readonly code: AIProviderCode = "openai";
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
          class: "administrator_correctable",
          retryable: false,
        });
      }
      this.client = new OpenAI({ apiKey: key });
    }
    return this.client;
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const started = Date.now();
    const timeoutMs =
      request.timeoutMs ??
      Number(process.env.EMAIL_AI_REQUEST_TIMEOUT_MS ?? 45000);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const client = this.getClient();
      const maxTokens =
        request.maxOutputTokens ??
        Number(process.env.EMAIL_AI_MAX_OUTPUT_TOKENS ?? 2048);

      const completion = await client.chat.completions.create(
        {
          model: request.model || getDefaultAiModel(),
          temperature: request.temperature ?? 0.4,
          max_tokens: maxTokens,
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
          estimatedCost: estimateCost(inputTokens, outputTokens, model),
          durationMs: Date.now() - started,
        },
        raw:
          process.env.EMAIL_AI_STORE_RAW_RESPONSES === "true"
            ? completion
            : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown AI error";
      const aborted = error instanceof Error && error.name === "AbortError";
      const rateLimited = /rate.?limit/i.test(message);
      throw Object.assign(new Error(message), {
        code: aborted
          ? "timeout"
          : rateLimited
            ? "rate_limit"
            : "provider_error",
        class: rateLimited || aborted ? "retryable" : "non_retryable",
        retryable: rateLimited || aborted,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createAIProvider(code?: string): AIProvider {
  const resolved = (code ?? getAiProviderCode()).toLowerCase();
  if (resolved === "openai") {
    const provider = new OpenAIEmailProvider();
    if (provider.isConfigured()) return provider;
  }
  return new DisabledAIProvider();
}

export function getAIProviderDiagnostics() {
  const openai = new OpenAIEmailProvider();
  return {
    preferredProvider: getAiProviderCode(),
    defaultModel: getDefaultAiModel(),
    openaiConfigured: openai.isConfigured(),
    globallyEnabled: process.env.EMAIL_AI_ENABLED === "true",
    autoActionsEnabled: process.env.EMAIL_AI_AUTO_ACTIONS_ENABLED === "true",
  };
}
