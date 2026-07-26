/**
 * Website crawl + contact discovery orchestrator (HTTP/HTML only — no browser).
 */

import {
  DEFAULT_CRAWL_LIMITS,
  type CrawlLimits,
  type CrawledPage,
  type DiscoveredEmail,
  type DiscoveredPhone,
  type DiscoveredSocial,
  type EnrichmentResult,
  type NormalizedWebsiteUrl,
} from "@/lib/enrichment/types";
import {
  categorizeEmail,
  checkDomainMx,
  extractEmailsFromText,
  normalizeEmail,
  scoreEmailConfidence,
  validateEmailSyntax,
} from "@/lib/enrichment/email-validation/email";
import { discoverPeopleFromText } from "@/lib/enrichment/contact-discovery/people";
import {
  categorizePhone,
  extractPhonesFromText,
  normalizePhone,
  scorePhoneConfidence,
} from "@/lib/enrichment/contact-discovery/phone";
import { fetchHtmlPage } from "@/lib/enrichment/website-crawler/fetch-page";
import {
  extractEmailsFromJsonLd,
  extractJsonLdStrings,
  extractLinks,
  extractMailto,
  extractMetaDescription,
  extractPhonesFromJsonLd,
  extractSocialLinks,
  extractTel,
  extractTitle,
  stripHtmlToText,
} from "@/lib/enrichment/website-crawler/html-extract";
import { normalizeWebsiteUrl } from "@/lib/enrichment/website-crawler/normalize-url";
import {
  classifyPage,
  rankDiscoveredLinks,
} from "@/lib/enrichment/website-crawler/page-classify";
import {
  fetchRobotsPolicy,
  isPathDisallowed,
} from "@/lib/enrichment/website-crawler/robots";
import { assertSafeHttpUrl } from "@/lib/enrichment/website-crawler/url-safety";

function sameDomain(a: string, b: string): boolean {
  try {
    const ha = new URL(a).hostname.replace(/^www\./, "").toLowerCase();
    const hb = new URL(b).hostname.replace(/^www\./, "").toLowerCase();
    return ha === hb;
  } catch {
    return false;
  }
}

async function crawlOnePage(
  url: string,
  limits: CrawlLimits,
  isHomepage: boolean,
): Promise<CrawledPage | null> {
  const fetched = await fetchHtmlPage(url, limits);
  if (!fetched.ok || !fetched.body) return null;

  const title = extractTitle(fetched.body);
  const metaDescription = extractMetaDescription(fetched.body);
  const classified = classifyPage({
    url: fetched.finalUrl,
    title,
    isHomepage,
  });
  const linkCandidates = extractLinks(fetched.body, fetched.finalUrl);
  const mailto = extractMailto(fetched.body);
  const tel = extractTel(fetched.body);
  const socialLinks = extractSocialLinks(linkCandidates);
  const jsonLd = extractJsonLdStrings(fetched.body);

  return {
    url,
    finalUrl: fetched.finalUrl,
    title,
    metaDescription,
    pageType: classified.pageType,
    pageTypeConfidence: classified.confidence,
    pageTypeReasons: classified.reasons,
    statusCode: fetched.availability.statusCode ?? 0,
    contentType: fetched.availability.contentType,
    text: stripHtmlToText(fetched.body).slice(0, 50_000),
    htmlLength: fetched.body.length,
    links: linkCandidates.map((l) => l.href),
    linkCandidates,
    mailto,
    tel,
    socialLinks,
    jsonLdEmails: extractEmailsFromJsonLd(jsonLd),
    jsonLdPhones: extractPhonesFromJsonLd(jsonLd),
    fetchedAt: new Date().toISOString(),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runWebsiteEnrichment(input: {
  companyId: string;
  websiteUrl: string;
  companyDomain?: string | null;
  companyCity?: string | null;
  companyCountry?: string | null;
  limits?: Partial<CrawlLimits>;
  onProgress?: (stage: string, detail?: string) => Promise<void> | void;
}): Promise<EnrichmentResult> {
  const started = Date.now();
  const limits: CrawlLimits = { ...DEFAULT_CRAWL_LIMITS, ...input.limits };
  const warnings: string[] = [];
  const website: NormalizedWebsiteUrl = normalizeWebsiteUrl(input.websiteUrl);

  if (website.status !== "ok" || !website.normalized || !website.origin) {
    return {
      companyId: input.companyId,
      website,
      availability: {
        status: "invalid_url",
        finalUrl: null,
        statusCode: null,
        contentType: null,
        responseTimeMs: 0,
        redirectCount: 0,
        httpsAvailable: false,
        pageSizeBytes: 0,
        message: website.reason ?? "Invalid website URL",
      },
      pages: [],
      emails: [],
      phones: [],
      socials: [],
      people: [],
      addresses: [],
      statistics: {
        pagesDiscovered: 0,
        pagesProcessed: 0,
        emailsFound: 0,
        phonesFound: 0,
        socialsFound: 0,
        peopleFound: 0,
        duplicatesPrevented: 0,
        warnings: [website.reason ?? "Invalid URL"],
        durationMs: Date.now() - started,
      },
      robots: { fetched: false, disallowed: [], message: "Skipped" },
    };
  }

  await input.onProgress?.("checking_website", website.normalized);
  const homepage = await crawlOnePage(website.normalized, limits, true);
  if (!homepage) {
    const availability = (
      await fetchHtmlPage(website.normalized, limits)
    ).availability;
    return {
      companyId: input.companyId,
      website: {
        ...website,
        finalUrl: availability.finalUrl,
        redirectCount: availability.redirectCount,
      },
      availability,
      pages: [],
      emails: [],
      phones: [],
      socials: [],
      people: [],
      addresses: [],
      statistics: {
        pagesDiscovered: 0,
        pagesProcessed: 0,
        emailsFound: 0,
        phonesFound: 0,
        socialsFound: 0,
        peopleFound: 0,
        duplicatesPrevented: 0,
        warnings: [availability.message],
        durationMs: Date.now() - started,
      },
      robots: { fetched: false, disallowed: [], message: "Skipped" },
    };
  }

  website.finalUrl = homepage.finalUrl;
  const origin = new URL(homepage.finalUrl).origin;

  await input.onProgress?.("robots", origin);
  const robots = await fetchRobotsPolicy(origin);
  if (!robots.fetched) warnings.push(robots.message);

  await input.onProgress?.("discovering_pages");
  const ranked = rankDiscoveredLinks(homepage.linkCandidates);

  const queue: string[] = [];
  const seen = new Set<string>([homepage.finalUrl]);
  for (const item of ranked) {
    if (queue.length >= limits.maxPages - 1) break;
    if (limits.sameDomainOnly && !sameDomain(item.href, homepage.finalUrl)) {
      continue;
    }
    try {
      const url = assertSafeHttpUrl(item.href);
      if (isPathDisallowed(url.pathname, robots.disallowed)) {
        warnings.push(`Skipped robots-disallowed path: ${url.pathname}`);
        continue;
      }
      if (seen.has(url.toString())) continue;
      seen.add(url.toString());
      queue.push(url.toString());
    } catch {
      // skip unsafe
    }
  }

  const pages: CrawledPage[] = [homepage];
  await input.onProgress?.("crawling_pages", `${queue.length} queued`);
  for (const url of queue) {
    if (Date.now() - started > limits.totalTimeoutMs) {
      warnings.push("Total crawl timeout reached");
      break;
    }
    if (pages.length >= limits.maxPages) break;
    if (limits.delayMs > 0) await sleep(limits.delayMs);
    const page = await crawlOnePage(url, limits, false);
    if (page) pages.push(page);
  }

  await input.onProgress?.("extracting_data");
  const emailMap = new Map<string, DiscoveredEmail>();
  const phoneMap = new Map<string, DiscoveredPhone>();
  const socialMap = new Map<string, DiscoveredSocial>();
  let duplicatesPrevented = 0;
  const companyDomain =
    input.companyDomain?.replace(/^www\./, "").toLowerCase() ??
    website.domain;

  for (const page of pages) {
    const emailCandidates = [
      ...page.mailto,
      ...page.jsonLdEmails,
      ...extractEmailsFromText(page.text),
    ];
    for (const raw of emailCandidates) {
      const normalized = normalizeEmail(raw);
      if (!normalized.includes("@")) continue;
      const syntaxStatus = validateEmailSyntax(normalized);
      if (syntaxStatus === "invalid_syntax" || syntaxStatus === "placeholder") {
        continue;
      }
      const existing = emailMap.get(normalized);
      if (existing) {
        duplicatesPrevented += 1;
        if (page.pageType === "contact" && existing.confidence < 90) {
          existing.confidence = Math.min(100, existing.confidence + 5);
        }
        continue;
      }
      const fromMailto = page.mailto.some(
        (m) => normalizeEmail(m) === normalized,
      );
      const scored = scoreEmailConfidence({
        email: normalized,
        syntaxStatus,
        companyDomain,
        sourcePageType: page.pageType,
        fromMailto,
        occurrences: 1,
      });
      let domainStatus: DiscoveredEmail["domainStatus"] = "unknown";
      try {
        const domain = normalized.split("@")[1];
        if (domain) domainStatus = await checkDomainMx(domain);
      } catch {
        domainStatus = "unknown";
      }

      emailMap.set(normalized, {
        email: normalized,
        normalized,
        category: categorizeEmail(normalized),
        syntaxStatus,
        domainStatus,
        mailboxStatus: "not_checked",
        confidence: scored.confidence,
        confidenceClass: scored.confidenceClass,
        factors: scored.factors,
        sourceUrl: page.finalUrl,
        pageType: page.pageType,
        extractionMethod: fromMailto ? "mailto" : "text_or_jsonld",
        reviewStatus:
          scored.confidenceClass === "high" ? "auto_accepted" : "needs_review",
      });
    }

    const phoneCandidates = [...page.tel, ...page.jsonLdPhones, ...extractPhonesFromText(page.text)];
    for (const raw of phoneCandidates) {
      const normalized = normalizePhone(raw);
      if (normalized.length < 8) continue;
      if (phoneMap.has(normalized)) {
        duplicatesPrevented += 1;
        continue;
      }
      const fromTel = page.tel.some((t) => normalizePhone(t) === normalized);
      phoneMap.set(normalized, {
        original: raw,
        normalized,
        category: categorizePhone(raw, page.pageType),
        confidence: scorePhoneConfidence({
          fromTelLink: fromTel,
          pageType: page.pageType,
        }),
        sourceUrl: page.finalUrl,
        pageType: page.pageType,
        reviewStatus: "needs_review",
      });
    }

    for (const social of page.socialLinks) {
      const key = `${social.platform}|${social.url}`.toLowerCase();
      if (socialMap.has(key)) {
        duplicatesPrevented += 1;
        continue;
      }
      socialMap.set(key, {
        platform: social.platform,
        url: social.url,
        confidence: 70,
        sourceUrl: page.finalUrl,
        companyRelated: true,
      });
    }
  }

  const emails = [...emailMap.values()];
  const phones = [...phoneMap.values()];
  const socials = [...socialMap.values()];
  const people = pages.flatMap((page) =>
    discoverPeopleFromText({
      text: page.text,
      sourceUrl: page.finalUrl,
      pageType: page.pageType,
      emails: emails.map((e) => e.email),
    }),
  );

  warnings.push(
    "Mailbox deliverability is not checked. Syntax/MX validation is not marketing consent.",
  );

  return {
    companyId: input.companyId,
    website,
    availability: {
      status: "reachable",
      finalUrl: homepage.finalUrl,
      statusCode: homepage.statusCode,
      contentType: homepage.contentType,
      responseTimeMs: 0,
      redirectCount: website.redirectCount,
      httpsAvailable: homepage.finalUrl.startsWith("https:"),
      pageSizeBytes: homepage.htmlLength,
      message: "Website crawled",
    },
    pages,
    emails,
    phones,
    socials,
    people,
    addresses: [],
    statistics: {
      pagesDiscovered: queue.length + 1,
      pagesProcessed: pages.length,
      emailsFound: emails.length,
      phonesFound: phones.length,
      socialsFound: socials.length,
      peopleFound: people.length,
      duplicatesPrevented,
      warnings,
      durationMs: Date.now() - started,
    },
    robots,
  };
}
