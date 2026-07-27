/**
 * Multi-provider model router + automatic failover.
 */

import { AnthropicKernelProvider } from "@/ai/providers/anthropic";
import { GeminiKernelProvider } from "@/ai/providers/gemini";
import { OpenAIKernelProvider } from "@/ai/providers/openai";
import {
  DEFAULT_FAILOVER_CHAIN,
  type AiProviderCode,
} from "@/ai/constants";
import type {
  AiProviderAdapter,
  ModelCompletionRequest,
  ModelCompletionResult,
} from "@/ai/types";

const adapters: AiProviderAdapter[] = [
  new OpenAIKernelProvider(),
  new AnthropicKernelProvider(),
  new GeminiKernelProvider(),
];

const byCode = new Map(adapters.map((a) => [a.code, a]));

const DEFAULT_MODELS: Partial<Record<AiProviderCode, string>> = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-3-5-haiku-latest",
  gemini: "gemini-2.0-flash",
};

export function listProviderAdapters(): AiProviderAdapter[] {
  return [...adapters];
}

export function getProviderAdapter(
  code: AiProviderCode,
): AiProviderAdapter | null {
  return byCode.get(code) ?? null;
}

export function getProviderStatusMap(): Record<
  string,
  { configured: boolean; label: string }
> {
  const labels: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    gemini: "Gemini",
    azure_openai: "Azure OpenAI",
    mistral: "Mistral",
    llama: "Llama",
    none: "Disabled",
  };
  const status: Record<string, { configured: boolean; label: string }> = {};
  for (const code of Object.keys(labels)) {
    const adapter = byCode.get(code as AiProviderCode);
    status[code] = {
      configured: adapter ? adapter.isConfigured() : false,
      label: labels[code] ?? code,
    };
  }
  return status;
}

function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== "object") return true;
  const record = error as { retryable?: boolean; code?: string };
  if (typeof record.retryable === "boolean") return record.retryable;
  return record.code !== "provider_auth";
}

export type RouteCompleteOptions = {
  preferredProvider: AiProviderCode;
  failoverProviders?: AiProviderCode[];
  onFailover?: (from: AiProviderCode, to: AiProviderCode, reason: string) => void;
};

/**
 * Completes a request with preferred provider, then failover chain.
 * Skips unconfigured providers. Stops workflow only when all fail.
 */
export async function routeComplete(
  request: ModelCompletionRequest,
  options: RouteCompleteOptions,
): Promise<ModelCompletionResult> {
  const chain: AiProviderCode[] = [];
  const seen = new Set<AiProviderCode>();
  for (const code of [
    options.preferredProvider,
    ...(options.failoverProviders?.length
      ? options.failoverProviders
      : DEFAULT_FAILOVER_CHAIN),
  ]) {
    if (code === "none") continue;
    if (seen.has(code)) continue;
    seen.add(code);
    chain.push(code);
  }

  const attempted: AiProviderCode[] = [];
  let lastError: unknown = null;
  let failoverUsed = false;

  for (let i = 0; i < chain.length; i++) {
    const code = chain[i]!;
    const adapter = getProviderAdapter(code);
    if (!adapter || !adapter.isConfigured()) continue;

    attempted.push(code);
    const model =
      i === 0 && request.model
        ? request.model
        : DEFAULT_MODELS[code] ?? request.model;

    try {
      const result = await adapter.complete({ ...request, model });
      return {
        content: result.content,
        provider: code,
        model: result.model,
        usage: result.usage,
        failoverUsed,
        attemptedProviders: attempted,
      };
    } catch (error) {
      lastError = error;
      const reason = error instanceof Error ? error.message : "provider_error";
      const next = chain.slice(i + 1).find((c) => {
        const a = getProviderAdapter(c);
        return a?.isConfigured();
      });
      if (next && isRetryable(error)) {
        failoverUsed = true;
        options.onFailover?.(code, next, reason);
        continue;
      }
      if (!isRetryable(error)) break;
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "No configured AI provider available.";
  throw Object.assign(new Error(message), {
    code: "all_providers_failed",
    attemptedProviders: attempted,
    retryable: false,
  });
}
