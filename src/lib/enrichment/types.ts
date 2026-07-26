/**
 * Website enrichment / contact discovery — shared types (Phase 20C).
 */

export type WebsiteAvailabilityStatus =
  | "reachable"
  | "unreachable"
  | "redirected"
  | "timeout"
  | "blocked"
  | "unsupported_content"
  | "ssl_error"
  | "rate_limited"
  | "robots_disallowed"
  | "invalid_url";

export type PageType =
  | "homepage"
  | "contact"
  | "about"
  | "team"
  | "location"
  | "service"
  | "legal"
  | "privacy"
  | "other";

export type EmailCategory =
  | "general"
  | "sales"
  | "support"
  | "information"
  | "administration"
  | "billing"
  | "careers"
  | "press"
  | "personal"
  | "unknown";

export type EmailSyntaxStatus =
  | "valid_syntax"
  | "invalid_syntax"
  | "suspicious"
  | "placeholder"
  | "role_address"
  | "personal_business"
  | "unknown";

export type EmailConfidenceClass =
  | "high"
  | "medium"
  | "low"
  | "invalid"
  | "unknown";

export type PhoneCategory =
  | "main"
  | "sales"
  | "support"
  | "mobile"
  | "fax"
  | "branch"
  | "personal"
  | "unknown";

export type SocialPlatform =
  | "linkedin"
  | "facebook"
  | "instagram"
  | "twitter"
  | "youtube"
  | "tiktok"
  | "pinterest"
  | "github"
  | "other";

export type ReviewStatus =
  | "new"
  | "accepted"
  | "rejected"
  | "needs_review"
  | "conflict"
  | "duplicate"
  | "auto_accepted";

export type NormalizedWebsiteUrl = {
  original: string;
  normalized: string;
  finalUrl: string | null;
  domain: string | null;
  hostname: string | null;
  protocol: string | null;
  origin: string | null;
  path: string;
  redirectCount: number;
  status: "ok" | "invalid" | "blocked_ssrf";
  reason?: string;
};

export type WebsiteAvailability = {
  status: WebsiteAvailabilityStatus;
  finalUrl: string | null;
  statusCode: number | null;
  contentType: string | null;
  responseTimeMs: number;
  redirectCount: number;
  httpsAvailable: boolean;
  pageSizeBytes: number;
  message: string;
};

export type CrawledPage = {
  url: string;
  finalUrl: string;
  title: string | null;
  metaDescription: string | null;
  pageType: PageType;
  pageTypeConfidence: number;
  pageTypeReasons: string[];
  statusCode: number;
  contentType: string | null;
  text: string;
  htmlLength: number;
  links: string[];
  linkCandidates: { href: string; text: string }[];
  mailto: string[];
  tel: string[];
  socialLinks: { platform: SocialPlatform; url: string }[];
  jsonLdEmails: string[];
  jsonLdPhones: string[];
  fetchedAt: string;
};

export type DiscoveredEmail = {
  email: string;
  normalized: string;
  category: EmailCategory;
  syntaxStatus: EmailSyntaxStatus;
  domainStatus: "domain_valid" | "mx_available" | "no_mx" | "dns_failure" | "unknown";
  mailboxStatus: "not_checked" | "unknown";
  confidence: number;
  confidenceClass: EmailConfidenceClass;
  factors: string[];
  sourceUrl: string;
  pageType: PageType;
  extractionMethod: string;
  reviewStatus: ReviewStatus;
};

export type DiscoveredPhone = {
  original: string;
  normalized: string;
  category: PhoneCategory;
  confidence: number;
  sourceUrl: string;
  pageType: PageType;
  reviewStatus: ReviewStatus;
};

export type DiscoveredSocial = {
  platform: SocialPlatform;
  url: string;
  confidence: number;
  sourceUrl: string;
  companyRelated: boolean;
};

export type DiscoveredPerson = {
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  confidence: number;
  sourceUrl: string;
  reasons: string[];
  reviewStatus: ReviewStatus;
};

export type DiscoveredAddress = {
  formatted: string;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  matchStatus: "match" | "partial" | "branch" | "conflict" | "unknown";
  sourceUrl: string;
  confidence: number;
};

export type EnrichmentResult = {
  companyId: string;
  website: NormalizedWebsiteUrl;
  availability: WebsiteAvailability;
  pages: CrawledPage[];
  emails: DiscoveredEmail[];
  phones: DiscoveredPhone[];
  socials: DiscoveredSocial[];
  people: DiscoveredPerson[];
  addresses: DiscoveredAddress[];
  statistics: {
    pagesDiscovered: number;
    pagesProcessed: number;
    emailsFound: number;
    phonesFound: number;
    socialsFound: number;
    peopleFound: number;
    duplicatesPrevented: number;
    warnings: string[];
    durationMs: number;
  };
  robots: {
    fetched: boolean;
    disallowed: string[];
    message: string;
  };
};

export type CrawlLimits = {
  maxPages: number;
  maxDepth: number;
  maxPageBytes: number;
  maxRedirects: number;
  requestTimeoutMs: number;
  totalTimeoutMs: number;
  delayMs: number;
  maxRetries: number;
  sameDomainOnly: boolean;
};

export const DEFAULT_CRAWL_LIMITS: CrawlLimits = {
  maxPages: 12,
  maxDepth: 2,
  maxPageBytes: 2 * 1024 * 1024,
  maxRedirects: 5,
  requestTimeoutMs: 15_000,
  totalTimeoutMs: 90_000,
  delayMs: 750,
  maxRetries: 1,
  sameDomainOnly: true,
};

export const WEBSITE_CRAWLER_CODE = "website_crawler";

export const COMPLIANCE_NOTICE =
  "Users remain responsible for complying with applicable privacy, marketing and anti-spam regulations. Technical email validation is not consent.";
