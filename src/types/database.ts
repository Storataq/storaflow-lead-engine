export type OrganizationRole = "owner" | "admin";

export type SearchQueryStatus =
  | "draft"
  | "active"
  | "paused"
  | "queued"
  | "running"
  | "completed"
  | "partially_completed"
  | "failed"
  | "cancelled";

/** Beheerstatus voor opgeslagen zoekcriteria (fase 2 UI). */
export type SearchCriteriaStatus = "draft" | "active" | "paused";

export type CompanySizeOption = "1-10" | "11-50" | "51-250" | "250+";

export type ScrapeJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "partially_completed"
  | "failed"
  | "cancelled";

export type ScrapeJobType =
  | "search_discovery"
  | "website_crawl"
  | "manual_url_list"
  | "recheck";

export type ScrapeSourceType =
  | "search_result"
  | "company_website"
  | "public_directory"
  | "manual_url_list";

export type CompanyStatus =
  | "new"
  | "reviewed"
  | "qualified"
  | "not_relevant"
  | "contacted"
  | "customer"
  | "blocked";

export type ContactType = "email" | "phone" | "contact_form";

export type ContactVerificationStatus =
  | "unknown"
  | "syntax_valid"
  | "valid"
  | "risky"
  | "invalid"
  | "blocked";

export type ExclusionType =
  | "domain"
  | "email"
  | "company"
  | "keyword"
  | "country";

export type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
};

export type OrganizationSettings = {
  id: string;
  organization_id: string;
  requests_per_minute: number;
  request_delay_ms: number;
  max_pages_per_domain: number;
  max_concurrency: number;
  request_timeout_ms: number;
  max_retries: number;
  prefer_generic_emails: boolean;
  allow_personal_emails: boolean;
  email_prefix_denylist: string[];
  user_agent: string;
  created_at: string;
  updated_at: string;
};

export type ActiveOrganizationContext = {
  organization: Organization;
  membership: OrganizationMember;
  profile: Profile | null;
};
