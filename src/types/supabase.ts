/**
 * Handmatige Supabase Database-types voor fase 1.
 * Later te vervangen door `supabase gen types typescript`.
 */

import type {
  CompanyStatus,
  ContactType,
  ContactVerificationStatus,
  ExclusionType,
  OrganizationRole,
  ScrapeJobLogLevel,
  ScrapeJobStatus,
  ScrapeJobType,
  ScrapeResultStatus,
  ScrapeSourceType,
  SearchQueryStatus,
} from "@/types/database";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TimestampRow = {
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrganizationRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: OrganizationRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: OrganizationRole;
          created_at?: string;
        };
        Relationships: [];
      };
      organization_settings: {
        Row: {
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
        Insert: {
          id?: string;
          organization_id: string;
          requests_per_minute?: number;
          request_delay_ms?: number;
          max_pages_per_domain?: number;
          max_concurrency?: number;
          request_timeout_ms?: number;
          max_retries?: number;
          prefer_generic_emails?: boolean;
          allow_personal_emails?: boolean;
          email_prefix_denylist?: string[];
          user_agent?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organization_settings"]["Insert"]>;
        Relationships: [];
      };
      search_queries: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string | null;
          name: string;
          keyword: string;
          industry: string | null;
          city: string | null;
          region: string | null;
          country: string | null;
          max_results: number;
          status: SearchQueryStatus;
          crawl_websites: boolean;
          only_generic_emails: boolean;
          source_type: ScrapeSourceType;
          countries: string[];
          keywords: string[];
          industries: string[];
          regions: string[];
          languages: string[];
          cities: string[];
          sources: string[];
          search_prompt: string | null;
          company_size: string | null;
          website_required: boolean;
          linkedin_required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by?: string | null;
          name: string;
          keyword: string;
          industry?: string | null;
          city?: string | null;
          region?: string | null;
          country?: string | null;
          max_results?: number;
          status?: SearchQueryStatus;
          crawl_websites?: boolean;
          only_generic_emails?: boolean;
          source_type?: ScrapeSourceType;
          countries?: string[];
          keywords?: string[];
          industries?: string[];
          regions?: string[];
          languages?: string[];
          cities?: string[];
          sources?: string[];
          search_prompt?: string | null;
          company_size?: string | null;
          website_required?: boolean;
          linkedin_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["search_queries"]["Insert"]>;
        Relationships: [];
      };
      scrape_jobs: {
        Row: {
          id: string;
          organization_id: string;
          search_query_id: string | null;
          job_type: ScrapeJobType;
          status: ScrapeJobStatus;
          started_at: string | null;
          completed_at: string | null;
          error_message: string | null;
          pages_processed: number;
          companies_found: number;
          contacts_found: number;
          claimed_at: string | null;
          claimed_by: string | null;
          progress_percent: number;
          current_source_code: string | null;
          error_count: number;
          target_pages: number;
          runtime_ms: number | null;
          last_heartbeat_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          search_query_id?: string | null;
          job_type?: ScrapeJobType;
          status?: ScrapeJobStatus;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          pages_processed?: number;
          companies_found?: number;
          contacts_found?: number;
          claimed_at?: string | null;
          claimed_by?: string | null;
          progress_percent?: number;
          current_source_code?: string | null;
          error_count?: number;
          target_pages?: number;
          runtime_ms?: number | null;
          last_heartbeat_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scrape_jobs"]["Insert"]>;
        Relationships: [];
      };
      scrape_sources: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          source_type: ScrapeSourceType;
          base_url: string | null;
          enabled: boolean;
          crawl_delay_ms: number;
          max_pages_per_run: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          source_type: ScrapeSourceType;
          base_url?: string | null;
          enabled?: boolean;
          crawl_delay_ms?: number;
          max_pages_per_run?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scrape_sources"]["Insert"]>;
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          organization_id: string;
          company_name: string;
          normalized_company_name: string;
          website_url: string | null;
          normalized_domain: string | null;
          description: string | null;
          industry: string | null;
          city: string | null;
          region: string | null;
          country: string | null;
          postal_code: string | null;
          phone: string | null;
          linkedin_url: string | null;
          facebook_url: string | null;
          instagram_url: string | null;
          source_url: string | null;
          source_type: ScrapeSourceType | null;
          first_found_at: string;
          last_checked_at: string | null;
          status: CompanyStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_name: string;
          normalized_company_name: string;
          website_url?: string | null;
          normalized_domain?: string | null;
          description?: string | null;
          industry?: string | null;
          city?: string | null;
          region?: string | null;
          country?: string | null;
          postal_code?: string | null;
          phone?: string | null;
          linkedin_url?: string | null;
          facebook_url?: string | null;
          instagram_url?: string | null;
          source_url?: string | null;
          source_type?: ScrapeSourceType | null;
          first_found_at?: string;
          last_checked_at?: string | null;
          status?: CompanyStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string;
          contact_type: ContactType;
          contact_value: string;
          normalized_value: string;
          label: string | null;
          person_name: string | null;
          job_title: string | null;
          is_public_business_contact: boolean;
          verification_status: ContactVerificationStatus;
          source_url: string | null;
          first_found_at: string;
          last_checked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id: string;
          contact_type: ContactType;
          contact_value: string;
          normalized_value: string;
          label?: string | null;
          person_name?: string | null;
          job_title?: string | null;
          is_public_business_contact?: boolean;
          verification_status?: ContactVerificationStatus;
          source_url?: string | null;
          first_found_at?: string;
          last_checked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
        Relationships: [];
      };
      company_sources: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string;
          scrape_job_id: string | null;
          source_url: string;
          source_type: ScrapeSourceType;
          discovered_at: string;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id: string;
          scrape_job_id?: string | null;
          source_url: string;
          source_type: ScrapeSourceType;
          discovered_at?: string;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_sources"]["Insert"]>;
        Relationships: [];
      };
      scrape_job_logs: {
        Row: {
          id: string;
          organization_id: string;
          scrape_job_id: string;
          level: ScrapeJobLogLevel;
          event_code: string;
          message: string;
          source_code: string | null;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          scrape_job_id: string;
          level?: ScrapeJobLogLevel;
          event_code: string;
          message: string;
          source_code?: string | null;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scrape_job_logs"]["Insert"]>;
        Relationships: [];
      };
      scrape_results: {
        Row: {
          id: string;
          organization_id: string;
          scrape_job_id: string;
          source_code: string;
          company_name: string;
          website_url: string | null;
          city: string | null;
          region: string | null;
          country: string | null;
          industry: string | null;
          raw_payload: Json;
          company_id: string | null;
          status: ScrapeResultStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          scrape_job_id: string;
          source_code: string;
          company_name: string;
          website_url?: string | null;
          city?: string | null;
          region?: string | null;
          country?: string | null;
          industry?: string | null;
          raw_payload?: Json;
          company_id?: string | null;
          status?: ScrapeResultStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scrape_results"]["Insert"]>;
        Relationships: [];
      };
      exclusion_list: {
        Row: {
          id: string;
          organization_id: string;
          exclusion_type: ExclusionType;
          exclusion_value: string;
          normalized_value: string;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          exclusion_type: ExclusionType;
          exclusion_value: string;
          normalized_value: string;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exclusion_list"]["Insert"]>;
        Relationships: [];
      };
      scrape_errors: {
        Row: {
          id: string;
          organization_id: string;
          scrape_job_id: string;
          url: string | null;
          error_type: string;
          error_message: string;
          http_status: number | null;
          retry_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          scrape_job_id: string;
          url?: string | null;
          error_type: string;
          error_message: string;
          http_status?: number | null;
          retry_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scrape_errors"]["Insert"]>;
        Relationships: [];
      };
      activity_events: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          event_type: string;
          entity_type: string | null;
          entity_id: string | null;
          description: string;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          event_type: string;
          entity_type?: string | null;
          entity_id?: string | null;
          description: string;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_events"]["Insert"]>;
        Relationships: [];
      };
      export_runs: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string | null;
          export_format: string;
          filters_json: Json;
          row_count: number;
          created_at: string;
        } & TimestampRow;
        Insert: {
          id?: string;
          organization_id: string;
          created_by?: string | null;
          export_format?: string;
          filters_json?: Json;
          row_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["export_runs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_org_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      is_org_owner_or_admin: {
        Args: { org_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      organization_role: OrganizationRole;
      search_query_status: SearchQueryStatus;
      scrape_job_status: ScrapeJobStatus;
      scrape_job_type: ScrapeJobType;
      scrape_source_type: ScrapeSourceType;
      company_status: CompanyStatus;
      contact_type: ContactType;
      contact_verification_status: ContactVerificationStatus;
      exclusion_type: ExclusionType;
    };
    CompositeTypes: Record<string, never>;
  };
};
