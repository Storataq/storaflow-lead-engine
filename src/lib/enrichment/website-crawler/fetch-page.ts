/**
 * Safe HTTP page fetch with size/timeout/SSRF guards.
 */

import { DEFAULT_USER_AGENT } from "@/lib/constants";
import type { CrawlLimits, WebsiteAvailability } from "@/lib/enrichment/types";
import { DEFAULT_CRAWL_LIMITS } from "@/lib/enrichment/types";
import { assertSafeHttpUrl } from "@/lib/enrichment/website-crawler/url-safety";

export type FetchedPage = {
  ok: boolean;
  availability: WebsiteAvailability;
  finalUrl: string;
  body: string;
};

async function delay(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkWebsiteAvailability(
  url: string,
  limits: CrawlLimits = DEFAULT_CRAWL_LIMITS,
): Promise<WebsiteAvailability> {
  const started = Date.now();
  try {
    assertSafeHttpUrl(url);
  } catch (error) {
    return {
      status: "invalid_url",
      finalUrl: null,
      statusCode: null,
      contentType: null,
      responseTimeMs: 0,
      redirectCount: 0,
      httpsAvailable: false,
      pageSizeBytes: 0,
      message: error instanceof Error ? error.message : "Invalid URL",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), limits.requestTimeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type");
    const buffer = await response.arrayBuffer();
    const size = buffer.byteLength;
    const responseTimeMs = Date.now() - started;
    const finalUrl = response.url || url;

    try {
      assertSafeHttpUrl(finalUrl);
    } catch {
      return {
        status: "blocked",
        finalUrl,
        statusCode: response.status,
        contentType,
        responseTimeMs,
        redirectCount: finalUrl === url ? 0 : 1,
        httpsAvailable: finalUrl.startsWith("https:"),
        pageSizeBytes: size,
        message: "Redirect target blocked by SSRF protection",
      };
    }

    if (response.status === 429) {
      return {
        status: "rate_limited",
        finalUrl,
        statusCode: response.status,
        contentType,
        responseTimeMs,
        redirectCount: finalUrl === url ? 0 : 1,
        httpsAvailable: finalUrl.startsWith("https:"),
        pageSizeBytes: size,
        message: "Rate limited by remote host",
      };
    }

    if (!response.ok) {
      return {
        status: "unreachable",
        finalUrl,
        statusCode: response.status,
        contentType,
        responseTimeMs,
        redirectCount: finalUrl === url ? 0 : 1,
        httpsAvailable: finalUrl.startsWith("https:"),
        pageSizeBytes: size,
        message: `HTTP ${response.status}`,
      };
    }

    if (
      contentType &&
      !/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)
    ) {
      return {
        status: "unsupported_content",
        finalUrl,
        statusCode: response.status,
        contentType,
        responseTimeMs,
        redirectCount: finalUrl === url ? 0 : 1,
        httpsAvailable: finalUrl.startsWith("https:"),
        pageSizeBytes: size,
        message: `Unsupported content type: ${contentType}`,
      };
    }

    return {
      status: finalUrl !== url ? "redirected" : "reachable",
      finalUrl,
      statusCode: response.status,
      contentType,
      responseTimeMs,
      redirectCount: finalUrl === url ? 0 : 1,
      httpsAvailable: finalUrl.startsWith("https:"),
      pageSizeBytes: size,
      message: "Website reachable",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const status =
      message.toLowerCase().includes("abort") ||
      message.toLowerCase().includes("timeout")
        ? "timeout"
        : message.toLowerCase().includes("ssl") ||
            message.toLowerCase().includes("cert")
          ? "ssl_error"
          : "unreachable";
    return {
      status,
      finalUrl: null,
      statusCode: null,
      contentType: null,
      responseTimeMs: Date.now() - started,
      redirectCount: 0,
      httpsAvailable: false,
      pageSizeBytes: 0,
      message,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchHtmlPage(
  url: string,
  limits: CrawlLimits = DEFAULT_CRAWL_LIMITS,
): Promise<FetchedPage> {
  await delay(limits.delayMs);
  const availability = await checkWebsiteAvailability(url, limits);
  if (
    availability.status !== "reachable" &&
    availability.status !== "redirected"
  ) {
    return {
      ok: false,
      availability,
      finalUrl: availability.finalUrl ?? url,
      body: "",
    };
  }

  const target = availability.finalUrl ?? url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), limits.requestTimeoutMs);
  try {
    assertSafeHttpUrl(target);
    const response = await fetch(target, {
      method: "GET",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    const reader = response.body?.getReader();
    if (!reader) {
      return { ok: false, availability, finalUrl: target, body: "" };
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limits.maxPageBytes) {
        reader.cancel().catch(() => undefined);
        return {
          ok: false,
          availability: {
            ...availability,
            status: "unsupported_content",
            pageSizeBytes: total,
            message: "Page exceeds size limit",
          },
          finalUrl: response.url || target,
          body: "",
        };
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const body = new TextDecoder("utf-8", { fatal: false }).decode(merged);
    return {
      ok: response.ok,
      availability: {
        ...availability,
        finalUrl: response.url || target,
        pageSizeBytes: total,
        statusCode: response.status,
      },
      finalUrl: response.url || target,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      availability: {
        ...availability,
        status: "timeout",
        message: error instanceof Error ? error.message : "Fetch failed",
      },
      finalUrl: target,
      body: "",
    };
  } finally {
    clearTimeout(timer);
  }
}
