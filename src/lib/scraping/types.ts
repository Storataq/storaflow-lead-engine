/**
 * Scraping interfaces — fase 1 stubs.
 * Geen actieve scraper-implementatie in deze fase.
 */

export type SearchInput = {
  keyword: string;
  industry?: string;
  city?: string;
  region?: string;
  country?: string;
  maxResults: number;
};

export type DiscoveredCompany = {
  companyName: string;
  websiteUrl?: string;
  sourceUrl: string;
  sourceType: "search_result" | "company_website" | "public_directory" | "manual_url_list";
  city?: string;
  region?: string;
  country?: string;
  industry?: string;
};

export type CrawlOptions = {
  maxPages: number;
  sameDomainOnly: boolean;
  requestDelayMs: number;
  timeoutMs: number;
  maxRedirects: number;
  userAgent: string;
};

export type CrawledPage = {
  url: string;
  finalUrl: string;
  statusCode: number;
  html: string;
  fetchedAt: string;
};

export type ExtractedContact = {
  contactType: "email" | "phone" | "contact_form";
  value: string;
  label?: string;
  personName?: string;
  jobTitle?: string;
  isPublicBusinessContact: boolean;
  sourceUrl: string;
};

export interface ScrapeSourceAdapter {
  discover(input: SearchInput): Promise<DiscoveredCompany[]>;
}

export interface SearchDiscoveryAdapter {
  search(input: SearchInput): Promise<DiscoveredCompany[]>;
}

export interface WebsiteCrawler {
  crawl(url: string, options: CrawlOptions): Promise<CrawledPage[]>;
}

export interface ContactExtractor {
  extract(page: CrawledPage): Promise<ExtractedContact[]>;
}

export interface CompanyNormalizer {
  normalizeCompanyName(name: string): string;
  normalizeDomain(urlOrDomain: string): string;
  normalizeEmail(email: string): string;
  normalizePhone(phone: string): string;
}

export interface DeduplicationService {
  findCompanyDuplicates(input: {
    organizationId: string;
    normalizedDomain?: string;
    normalizedCompanyName: string;
    city?: string;
  }): Promise<{ possibleDuplicateIds: string[] }>;
}

export interface ExclusionService {
  isExcluded(input: {
    organizationId: string;
    domain?: string;
    email?: string;
    companyName?: string;
    keyword?: string;
    country?: string;
  }): Promise<boolean>;
}
