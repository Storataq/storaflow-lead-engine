/**
 * Handmatige Supabase Database-types voor fase 1.
 * Later te vervangen door `supabase gen types typescript`.
 */

import type {
  CompanyStatus,
  ContactType,
  ContactVerificationStatus,
  CrmDealStatus,
  CrmLeadStatus,
  CrmTaskPriority,
  CrmTaskStatus,
  ExclusionType,
  OrganizationRole,
  ScrapeJobLogLevel,
  ScrapeJobPriority,
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
          postal_address: string | null;
          privacy_policy_url: string | null;
          terms_url: string | null;
          support_email: string | null;
          logo_url: string | null;
          default_email_language: string;
          email_company_address_required: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          postal_address?: string | null;
          privacy_policy_url?: string | null;
          terms_url?: string | null;
          support_email?: string | null;
          logo_url?: string | null;
          default_email_language?: string;
          email_company_address_required?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          postal_address?: string | null;
          privacy_policy_url?: string | null;
          terms_url?: string | null;
          support_email?: string | null;
          logo_url?: string | null;
          default_email_language?: string;
          email_company_address_required?: boolean;
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
          funnel_activation_mode: "manual" | "assisted" | "automatic";
          qualification_threshold: number;
          opportunity_threshold: number;
          auto_deal_mode: "never" | "recommend" | "automatic";
          auto_create_tasks: boolean;
          allow_role_emails: boolean;
          require_named_contact: boolean;
          require_manual_approval: boolean;
          skip_recent_activation_hours: number;
          default_funnel_pipeline_id: string | null;
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
          funnel_activation_mode?: "manual" | "assisted" | "automatic";
          qualification_threshold?: number;
          opportunity_threshold?: number;
          auto_deal_mode?: "never" | "recommend" | "automatic";
          auto_create_tasks?: boolean;
          allow_role_emails?: boolean;
          require_named_contact?: boolean;
          require_manual_approval?: boolean;
          skip_recent_activation_hours?: number;
          default_funnel_pipeline_id?: string | null;
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
          pages_total: number;
          priority: ScrapeJobPriority;
          retry_count: number;
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
          pages_total?: number;
          priority?: ScrapeJobPriority;
          retry_count?: number;
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
          company_category_id: string | null;
          category_manual_override: boolean;
          category_needs_review: boolean;
          category_confidence: number | null;
          suggested_company_category_id: string | null;
          category_classified_at: string | null;
          category_classified_by: string | null;
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
          company_category_id?: string | null;
          category_manual_override?: boolean;
          category_needs_review?: boolean;
          category_confidence?: number | null;
          suggested_company_category_id?: string | null;
          category_classified_at?: string | null;
          category_classified_by?: string | null;
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
      company_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          description: string | null;
          icon: string | null;
          color: string | null;
          sort_order: number;
          is_active: boolean;
          is_system_default: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          sort_order?: number;
          is_active?: boolean;
          is_system_default?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_categories"]["Insert"]>;
        Relationships: [];
      };
      company_category_classifications: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string;
          suggested_category_id: string | null;
          applied_category_id: string | null;
          confidence: number;
          confidence_band: string;
          reason: string | null;
          keywords_json: Json;
          alternatives_json: Json;
          input_summary_json: Json;
          source: string;
          classified_by: string;
          provider: string | null;
          model: string | null;
          actor_user_id: string | null;
          manual_override: boolean;
          needs_review: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id: string;
          suggested_category_id?: string | null;
          applied_category_id?: string | null;
          confidence?: number;
          confidence_band?: string;
          reason?: string | null;
          keywords_json?: Json;
          alternatives_json?: Json;
          input_summary_json?: Json;
          source?: string;
          classified_by?: string;
          provider?: string | null;
          model?: string | null;
          actor_user_id?: string | null;
          manual_override?: boolean;
          needs_review?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["company_category_classifications"]["Insert"]
        >;
        Relationships: [];
      };
      company_category_classification_history: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string;
          classification_id: string | null;
          old_category_id: string | null;
          new_category_id: string | null;
          suggested_category_id: string | null;
          confidence: number | null;
          reason: string | null;
          event_type: string;
          is_automatic: boolean;
          actor_user_id: string | null;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id: string;
          classification_id?: string | null;
          old_category_id?: string | null;
          new_category_id?: string | null;
          suggested_category_id?: string | null;
          confidence?: number | null;
          reason?: string | null;
          event_type: string;
          is_automatic?: boolean;
          actor_user_id?: string | null;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["company_category_classification_history"]["Insert"]
        >;
        Relationships: [];
      };
      company_category_action_runs: {
        Row: {
          id: string;
          organization_id: string;
          company_category_id: string;
          action_type: string;
          status: string;
          company_ids: Json;
          company_count: number;
          result_summary: Json;
          error_message: string | null;
          actor_user_id: string | null;
          confirmed: boolean;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_category_id: string;
          action_type: string;
          status?: string;
          company_ids?: Json;
          company_count?: number;
          result_summary?: Json;
          error_message?: string | null;
          actor_user_id?: string | null;
          confirmed?: boolean;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["company_category_action_runs"]["Insert"]
        >;
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
      crm_pipelines: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          description: string | null;
          color: string;
          is_default: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          description?: string | null;
          color?: string;
          is_default?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["crm_pipelines"]["Insert"]>;
        Relationships: [];
      };
      crm_funnel_stages: {
        Row: {
          id: string;
          organization_id: string;
          pipeline_id: string;
          name: string;
          slug: string;
          color: string;
          sort_order: number;
          is_won: boolean;
          is_lost: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          pipeline_id: string;
          name: string;
          slug: string;
          color?: string;
          sort_order?: number;
          is_won?: boolean;
          is_lost?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["crm_funnel_stages"]["Insert"]
        >;
        Relationships: [];
      };
      crm_leads: {
        Row: {
          id: string;
          organization_id: string;
          pipeline_id: string;
          stage_id: string;
          company_id: string | null;
          company_name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          website: string | null;
          country: string | null;
          city: string | null;
          industry: string | null;
          owner_user_id: string | null;
          source: string | null;
          lead_score: number;
          status: CrmLeadStatus;
          tags: string[];
          notes: string | null;
          deal_value: number;
          currency: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          pipeline_id: string;
          stage_id: string;
          company_id?: string | null;
          company_name: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          country?: string | null;
          city?: string | null;
          industry?: string | null;
          owner_user_id?: string | null;
          source?: string | null;
          lead_score?: number;
          status?: CrmLeadStatus;
          tags?: string[];
          notes?: string | null;
          deal_value?: number;
          currency?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["crm_leads"]["Insert"]>;
        Relationships: [];
      };
      crm_deals: {
        Row: {
          id: string;
          organization_id: string;
          lead_id: string | null;
          pipeline_id: string;
          stage_id: string;
          title: string;
          value: number;
          currency: string;
          status: CrmDealStatus;
          expected_close_date: string | null;
          owner_user_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lead_id?: string | null;
          pipeline_id: string;
          stage_id: string;
          title: string;
          value?: number;
          currency?: string;
          status?: CrmDealStatus;
          expected_close_date?: string | null;
          owner_user_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["crm_deals"]["Insert"]>;
        Relationships: [];
      };
      crm_tasks: {
        Row: {
          id: string;
          organization_id: string;
          lead_id: string | null;
          deal_id: string | null;
          title: string;
          description: string | null;
          due_at: string | null;
          priority: CrmTaskPriority;
          status: CrmTaskStatus;
          assigned_user_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lead_id?: string | null;
          deal_id?: string | null;
          title: string;
          description?: string | null;
          due_at?: string | null;
          priority?: CrmTaskPriority;
          status?: CrmTaskStatus;
          assigned_user_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["crm_tasks"]["Insert"]>;
        Relationships: [];
      };
      crm_notes: {
        Row: {
          id: string;
          organization_id: string;
          lead_id: string | null;
          deal_id: string | null;
          body_html: string;
          body_text: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lead_id?: string | null;
          deal_id?: string | null;
          body_html?: string;
          body_text?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["crm_notes"]["Insert"]>;
        Relationships: [];
      };
      crm_lead_contacts: {
        Row: {
          id: string;
          organization_id: string;
          lead_id: string;
          first_name: string;
          last_name: string;
          job_title: string | null;
          email: string | null;
          phone: string | null;
          linkedin_url: string | null;
          is_primary: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lead_id: string;
          first_name?: string;
          last_name?: string;
          job_title?: string | null;
          email?: string | null;
          phone?: string | null;
          linkedin_url?: string | null;
          is_primary?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["crm_lead_contacts"]["Insert"]
        >;
        Relationships: [];
      };
      funnel_activation_runs: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string | null;
          lead_id: string | null;
          trigger_source: string;
          status: string;
          current_step: string | null;
          completed_steps: string[];
          failed_step: string | null;
          retry_count: number;
          warning_count: number;
          idempotency_key: string;
          result_summary: Json;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          source_company_category_id: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id?: string | null;
          lead_id?: string | null;
          trigger_source?: string;
          status?: string;
          current_step?: string | null;
          completed_steps?: string[];
          failed_step?: string | null;
          retry_count?: number;
          warning_count?: number;
          idempotency_key: string;
          result_summary?: Json;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          source_company_category_id?: string | null;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["funnel_activation_runs"]["Insert"]
        >;
        Relationships: [];
      };
      campaign_readiness: {
        Row: {
          id: string;
          organization_id: string;
          lead_id: string;
          company_id: string | null;
          contact_id: string | null;
          status: string;
          approval_status: string;
          sales_priority: string;
          personalization_status: string;
          preferred_email: string | null;
          preferred_name: string | null;
          preferred_phone: string | null;
          contactability: string | null;
          qualification_score: number;
          opportunity_score: number;
          priority_score: number;
          reasons: string[];
          missing_requirements: string[];
          factors_json: Json;
          personalization_json: Json;
          suppression_reason: string | null;
          activation_run_id: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_notes: string | null;
          calculated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lead_id: string;
          company_id?: string | null;
          contact_id?: string | null;
          status?: string;
          approval_status?: string;
          sales_priority?: string;
          personalization_status?: string;
          preferred_email?: string | null;
          preferred_name?: string | null;
          preferred_phone?: string | null;
          contactability?: string | null;
          qualification_score?: number;
          opportunity_score?: number;
          priority_score?: number;
          reasons?: string[];
          missing_requirements?: string[];
          factors_json?: Json;
          personalization_json?: Json;
          suppression_reason?: string | null;
          activation_run_id?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          calculated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["campaign_readiness"]["Insert"]
        >;
        Relationships: [];
      };
      email_campaigns: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          status: string;
          audience_id: string | null;
          sequence_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          campaign_type: string;
          objective: string | null;
          language: string;
          template_id: string | null;
          template_version_id: string | null;
          template_subject_snapshot: string | null;
          template_preview_snapshot: string | null;
          template_html_snapshot: string | null;
          template_text_snapshot: string | null;
          template_variables_snapshot: string[];
          sender_profile_id: string | null;
          owner_user_id: string | null;
          approved_by: string | null;
          approved_at: string | null;
          archived_at: string | null;
          notes: string | null;
          settings_json: Json;
          audience_definition_json: Json;
          recipient_count: number;
          valid_recipient_count: number;
          excluded_recipient_count: number;
          readiness_score: number;
          readiness_classification: string;
          locked: boolean;
          sequence_version: number | null;
          sequence_version_id: string | null;
          sequence_name_snapshot: string | null;
          sequence_steps_snapshot: Json | null;
          compliance_ack: boolean;
          last_validation_json: Json;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          status?: string;
          audience_id?: string | null;
          sequence_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          campaign_type?: string;
          objective?: string | null;
          language?: string;
          template_id?: string | null;
          template_version_id?: string | null;
          template_subject_snapshot?: string | null;
          template_preview_snapshot?: string | null;
          template_html_snapshot?: string | null;
          template_text_snapshot?: string | null;
          template_variables_snapshot?: string[];
          sender_profile_id?: string | null;
          owner_user_id?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          archived_at?: string | null;
          notes?: string | null;
          settings_json?: Json;
          audience_definition_json?: Json;
          recipient_count?: number;
          valid_recipient_count?: number;
          excluded_recipient_count?: number;
          readiness_score?: number;
          readiness_classification?: string;
          locked?: boolean;
          sequence_version?: number | null;
          sequence_version_id?: string | null;
          sequence_name_snapshot?: string | null;
          sequence_steps_snapshot?: Json | null;
          compliance_ack?: boolean;
          last_validation_json?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["email_campaigns"]["Insert"]>;
        Relationships: [];
      };
      email_sender_profiles: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          sender_name: string;
          sender_email: string;
          reply_to_name: string | null;
          reply_to_email: string | null;
          status: string;
          provider_reference: string | null;
          domain_verification_status: string;
          is_default: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          sender_name?: string;
          sender_email?: string;
          reply_to_name?: string | null;
          reply_to_email?: string | null;
          status?: string;
          provider_reference?: string | null;
          domain_verification_status?: string;
          is_default?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_sender_profiles"]["Insert"]
        >;
        Relationships: [];
      };
      email_campaign_approvals: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string;
          status: string;
          reviewer_user_id: string | null;
          reviewed_at: string | null;
          decision: string | null;
          reason: string | null;
          notes: string | null;
          validation_snapshot: Json;
          recipient_count_snapshot: number;
          template_version_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id: string;
          status?: string;
          reviewer_user_id?: string | null;
          reviewed_at?: string | null;
          decision?: string | null;
          reason?: string | null;
          notes?: string | null;
          validation_snapshot?: Json;
          recipient_count_snapshot?: number;
          template_version_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_campaign_approvals"]["Insert"]
        >;
        Relationships: [];
      };
      email_campaign_validations: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string;
          readiness_score: number;
          classification: string;
          blocking_count: number;
          warning_count: number;
          info_count: number;
          issues_json: Json;
          summary_json: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id: string;
          readiness_score?: number;
          classification?: string;
          blocking_count?: number;
          warning_count?: number;
          info_count?: number;
          issues_json?: Json;
          summary_json?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_campaign_validations"]["Insert"]
        >;
        Relationships: [];
      };
      email_campaign_activities: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string;
          event_type: string;
          description: string;
          metadata_json: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id: string;
          event_type: string;
          description: string;
          metadata_json?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_campaign_activities"]["Insert"]
        >;
        Relationships: [];
      };
      email_sequences: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          status: string;
          version: number;
          steps_json: Json;
          category: string;
          default_language: string;
          campaign_type_compatibility: string[];
          created_by: string | null;
          updated_by: string | null;
          archived_at: string | null;
          current_version_id: string | null;
          readiness_score: number;
          readiness_classification: string;
          stop_rules_json: Json;
          safety_limits_json: Json;
          settings_json: Json;
          last_validation_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          status?: string;
          version?: number;
          steps_json?: Json;
          category?: string;
          default_language?: string;
          campaign_type_compatibility?: string[];
          created_by?: string | null;
          updated_by?: string | null;
          archived_at?: string | null;
          current_version_id?: string | null;
          readiness_score?: number;
          readiness_classification?: string;
          stop_rules_json?: Json;
          safety_limits_json?: Json;
          settings_json?: Json;
          last_validation_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_sequences"]["Insert"]>;
        Relationships: [];
      };
      email_sequence_versions: {
        Row: {
          id: string;
          organization_id: string;
          sequence_id: string;
          version_number: number;
          status: string;
          name: string;
          description: string | null;
          category: string;
          default_language: string;
          steps_json: Json;
          stop_rules_json: Json;
          safety_limits_json: Json;
          change_notes: string | null;
          is_current: boolean;
          published_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          sequence_id: string;
          version_number: number;
          status?: string;
          name: string;
          description?: string | null;
          category?: string;
          default_language?: string;
          steps_json?: Json;
          stop_rules_json?: Json;
          safety_limits_json?: Json;
          change_notes?: string | null;
          is_current?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_sequence_versions"]["Insert"]
        >;
        Relationships: [];
      };
      email_sequence_validations: {
        Row: {
          id: string;
          organization_id: string;
          sequence_id: string;
          version_number: number | null;
          readiness_score: number;
          classification: string;
          blocking_count: number;
          warning_count: number;
          info_count: number;
          issues_json: Json;
          summary_json: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          sequence_id: string;
          version_number?: number | null;
          readiness_score?: number;
          classification?: string;
          blocking_count?: number;
          warning_count?: number;
          info_count?: number;
          issues_json?: Json;
          summary_json?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_sequence_validations"]["Insert"]
        >;
        Relationships: [];
      };
      email_sequence_activities: {
        Row: {
          id: string;
          organization_id: string;
          sequence_id: string;
          event_type: string;
          description: string;
          metadata_json: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          sequence_id: string;
          event_type: string;
          description: string;
          metadata_json?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_sequence_activities"]["Insert"]
        >;
        Relationships: [];
      };
      email_templates: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          subject: string;
          preview_text: string | null;
          html_body: string;
          text_body: string | null;
          variables: string[];
          language: string;
          category: string | null;
          version: number;
          status: string;
          created_by: string | null;
          archived_at: string | null;
          tags: string[];
          folder_id: string | null;
          is_library_placeholder: boolean;
          fallbacks_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          subject?: string;
          preview_text?: string | null;
          html_body?: string;
          text_body?: string | null;
          variables?: string[];
          language?: string;
          category?: string | null;
          version?: number;
          status?: string;
          created_by?: string | null;
          archived_at?: string | null;
          tags?: string[];
          folder_id?: string | null;
          is_library_placeholder?: boolean;
          fallbacks_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_templates"]["Insert"]>;
        Relationships: [];
      };
      email_template_folders: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_template_folders"]["Insert"]
        >;
        Relationships: [];
      };
      email_template_versions: {
        Row: {
          id: string;
          organization_id: string;
          template_id: string;
          version_number: number;
          name: string;
          subject: string;
          preview_text: string | null;
          html_body: string;
          text_body: string | null;
          variables: string[];
          change_notes: string | null;
          is_current: boolean;
          previous_version_number: number | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          template_id: string;
          version_number: number;
          name: string;
          subject?: string;
          preview_text?: string | null;
          html_body?: string;
          text_body?: string | null;
          variables?: string[];
          change_notes?: string | null;
          is_current?: boolean;
          previous_version_number?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_template_versions"]["Insert"]
        >;
        Relationships: [];
      };
      email_audiences: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          filter_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          filter_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_audiences"]["Insert"]>;
        Relationships: [];
      };
      email_recipients: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string | null;
          company_id: string | null;
          lead_id: string | null;
          contact_id: string | null;
          preferred_email: string;
          preferred_name: string | null;
          language: string | null;
          campaign_status: string;
          sequence_status: string;
          suppression_status: string;
          validation_status: string;
          personalization_json: Json;
          created_at: string;
          updated_at: string;
          is_snapshot: boolean;
          eligibility_status: string;
          exclusion_reason: string | null;
          company_name: string | null;
          owner_user_id: string | null;
          qualification_score: number | null;
          opportunity_score: number | null;
          priority: string | null;
          source: string | null;
          snapshot_at: string | null;
          duplicate_of_recipient_id: string | null;
          personalization_status: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id?: string | null;
          company_id?: string | null;
          lead_id?: string | null;
          contact_id?: string | null;
          preferred_email: string;
          preferred_name?: string | null;
          language?: string | null;
          campaign_status?: string;
          sequence_status?: string;
          suppression_status?: string;
          validation_status?: string;
          personalization_json?: Json;
          created_at?: string;
          updated_at?: string;
          is_snapshot?: boolean;
          eligibility_status?: string;
          exclusion_reason?: string | null;
          company_name?: string | null;
          owner_user_id?: string | null;
          qualification_score?: number | null;
          opportunity_score?: number | null;
          priority?: string | null;
          source?: string | null;
          snapshot_at?: string | null;
          duplicate_of_recipient_id?: string | null;
          personalization_status?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["email_recipients"]["Insert"]>;
        Relationships: [];
      };
      email_queue: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string | null;
          recipient_id: string;
          sequence_id: string | null;
          step_id: string | null;
          template_id: string | null;
          status: string;
          scheduled_at: string | null;
          provider_code: string;
          provider_message_id: string | null;
          attempt_count: number;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id?: string | null;
          recipient_id: string;
          sequence_id?: string | null;
          step_id?: string | null;
          template_id?: string | null;
          status?: string;
          scheduled_at?: string | null;
          provider_code?: string;
          provider_message_id?: string | null;
          attempt_count?: number;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_queue"]["Insert"]>;
        Relationships: [];
      };
      email_suppressions: {
        Row: {
          id: string;
          organization_id: string;
          email_normalized: string;
          status: string;
          reason: string;
          source: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email_normalized: string;
          status?: string;
          reason?: string;
          source?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_suppressions"]["Insert"]
        >;
        Relationships: [];
      };
      email_events: {
        Row: {
          id: string;
          organization_id: string;
          queue_item_id: string | null;
          recipient_id: string | null;
          campaign_id: string | null;
          event_type: string;
          bounce_type: string | null;
          payload_json: Json;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          queue_item_id?: string | null;
          recipient_id?: string | null;
          campaign_id?: string | null;
          event_type: string;
          bounce_type?: string | null;
          payload_json?: Json;
          occurred_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_events"]["Insert"]>;
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
      crm_lead_status: CrmLeadStatus;
      crm_deal_status: CrmDealStatus;
      crm_task_priority: CrmTaskPriority;
      crm_task_status: CrmTaskStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
