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
          lifecycle_status: string;
          suspended_at: string | null;
          archived_at: string | null;
          deleted_at: string | null;
          country: string | null;
          last_activity_at: string | null;
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
          lifecycle_status?: string;
          suspended_at?: string | null;
          archived_at?: string | null;
          deleted_at?: string | null;
          country?: string | null;
          last_activity_at?: string | null;
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
          lifecycle_status?: string;
          suspended_at?: string | null;
          archived_at?: string | null;
          deleted_at?: string | null;
          country?: string | null;
          last_activity_at?: string | null;
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
          intelligence_score: number | null;
          lead_potential_score: number | null;
          intelligence_status: string | null;
          intelligence_analyzed_at: string | null;
          intelligence_needs_review: boolean;
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
          intelligence_score?: number | null;
          lead_potential_score?: number | null;
          intelligence_status?: string | null;
          intelligence_analyzed_at?: string | null;
          intelligence_needs_review?: boolean;
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
      company_intelligence_profiles: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string;
          status: string;
          summary_json: Json;
          business_profile_json: Json;
          online_presence_json: Json;
          insights_json: Json;
          health_json: Json;
          lead_potential_json: Json;
          contact_quality_json: Json;
          growth_signals_json: Json;
          recommendations_json: Json;
          signals_json: Json;
          health_score: number;
          lead_potential_score: number;
          confidence: number;
          needs_review: boolean;
          provider: string | null;
          model: string | null;
          analyzed_by: string;
          source: string;
          actor_user_id: string | null;
          error_message: string | null;
          analyzed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id: string;
          status?: string;
          summary_json?: Json;
          business_profile_json?: Json;
          online_presence_json?: Json;
          insights_json?: Json;
          health_json?: Json;
          lead_potential_json?: Json;
          contact_quality_json?: Json;
          growth_signals_json?: Json;
          recommendations_json?: Json;
          signals_json?: Json;
          health_score?: number;
          lead_potential_score?: number;
          confidence?: number;
          needs_review?: boolean;
          provider?: string | null;
          model?: string | null;
          analyzed_by?: string;
          source?: string;
          actor_user_id?: string | null;
          error_message?: string | null;
          analyzed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["company_intelligence_profiles"]["Insert"]
        >;
        Relationships: [];
      };
      company_intelligence_runs: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string;
          profile_id: string | null;
          status: string;
          input_summary_json: Json;
          output_json: Json;
          error_message: string | null;
          provider: string | null;
          model: string | null;
          duration_ms: number | null;
          actor_user_id: string | null;
          source: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id: string;
          profile_id?: string | null;
          status?: string;
          input_summary_json?: Json;
          output_json?: Json;
          error_message?: string | null;
          provider?: string | null;
          model?: string | null;
          duration_ms?: number | null;
          actor_user_id?: string | null;
          source?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["company_intelligence_runs"]["Insert"]
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
          is_archived: boolean;
          archived_at: string | null;
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
          is_archived?: boolean;
          archived_at?: string | null;
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
          probability: number;
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
          probability?: number;
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
          ai_lead_score: number | null;
          score_classification: string | null;
          opportunity_band: string | null;
          opportunity_confidence: number | null;
          risk_score: number | null;
          buying_readiness: string | null;
          scoring_confidence: number | null;
          scored_at: string | null;
          score_delta: number | null;
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
          ai_lead_score?: number | null;
          score_classification?: string | null;
          opportunity_band?: string | null;
          opportunity_confidence?: number | null;
          risk_score?: number | null;
          buying_readiness?: string | null;
          scoring_confidence?: number | null;
          scored_at?: string | null;
          score_delta?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["crm_leads"]["Insert"]>;
        Relationships: [];
      };
      lead_scoring_settings: {
        Row: {
          id: string;
          organization_id: string;
          weights_json: Json;
          classification_ranges_json: Json;
          thresholds_json: Json;
          automation_triggers_json: Json;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          weights_json?: Json;
          classification_ranges_json?: Json;
          thresholds_json?: Json;
          automation_triggers_json?: Json;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["lead_scoring_settings"]["Insert"]
        >;
        Relationships: [];
      };
      lead_scoring_profiles: {
        Row: {
          id: string;
          organization_id: string;
          entity_type: string;
          lead_id: string | null;
          company_id: string | null;
          contact_id: string | null;
          overall_score: number;
          classification: string;
          opportunity_band: string;
          opportunity_confidence: number;
          risk_score: number;
          buying_readiness: string;
          confidence: number;
          category_scores_json: Json;
          sub_scores_json: Json;
          explanations_json: Json;
          risks_json: Json;
          next_best_actions_json: Json;
          signals_json: Json;
          weights_snapshot_json: Json;
          provider: string | null;
          model: string | null;
          source: string;
          actor_user_id: string | null;
          scored_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          entity_type?: string;
          lead_id?: string | null;
          company_id?: string | null;
          contact_id?: string | null;
          overall_score?: number;
          classification?: string;
          opportunity_band?: string;
          opportunity_confidence?: number;
          risk_score?: number;
          buying_readiness?: string;
          confidence?: number;
          category_scores_json?: Json;
          sub_scores_json?: Json;
          explanations_json?: Json;
          risks_json?: Json;
          next_best_actions_json?: Json;
          signals_json?: Json;
          weights_snapshot_json?: Json;
          provider?: string | null;
          model?: string | null;
          source?: string;
          actor_user_id?: string | null;
          scored_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["lead_scoring_profiles"]["Insert"]
        >;
        Relationships: [];
      };
      lead_scoring_history: {
        Row: {
          id: string;
          organization_id: string;
          profile_id: string | null;
          entity_type: string;
          lead_id: string | null;
          company_id: string | null;
          contact_id: string | null;
          old_score: number | null;
          new_score: number;
          delta: number | null;
          old_classification: string | null;
          new_classification: string | null;
          reason: string;
          explanations_json: Json;
          source: string;
          actor_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          profile_id?: string | null;
          entity_type?: string;
          lead_id?: string | null;
          company_id?: string | null;
          contact_id?: string | null;
          old_score?: number | null;
          new_score: number;
          delta?: number | null;
          old_classification?: string | null;
          new_classification?: string | null;
          reason?: string;
          explanations_json?: Json;
          source?: string;
          actor_user_id?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["lead_scoring_history"]["Insert"]
        >;
        Relationships: [];
      };
      lead_scoring_alerts: {
        Row: {
          id: string;
          organization_id: string;
          lead_id: string | null;
          company_id: string | null;
          alert_type: string;
          severity: string;
          title: string;
          message: string;
          payload_json: Json;
          acknowledged_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lead_id?: string | null;
          company_id?: string | null;
          alert_type: string;
          severity?: string;
          title: string;
          message: string;
          payload_json?: Json;
          acknowledged_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["lead_scoring_alerts"]["Insert"]
        >;
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
          description: string | null;
          probability: number | null;
          expected_revenue: number | null;
          priority: string;
          tags: string[];
          primary_contact_id: string | null;
          closed_at: string | null;
          won_reason: string | null;
          lost_reason: string | null;
          close_notes: string | null;
          competitor: string | null;
          last_stage_changed_at: string | null;
          lead_ai_score: number | null;
          lead_score_classification: string | null;
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
          description?: string | null;
          probability?: number | null;
          expected_revenue?: number | null;
          priority?: string;
          tags?: string[];
          primary_contact_id?: string | null;
          closed_at?: string | null;
          won_reason?: string | null;
          lost_reason?: string | null;
          close_notes?: string | null;
          competitor?: string | null;
          last_stage_changed_at?: string | null;
          lead_ai_score?: number | null;
          lead_score_classification?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["crm_deals"]["Insert"]>;
        Relationships: [];
      };
      crm_deal_stage_history: {
        Row: {
          id: string;
          organization_id: string;
          deal_id: string;
          from_stage_id: string | null;
          to_stage_id: string;
          from_status: string | null;
          to_status: string | null;
          changed_by: string | null;
          note: string | null;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          deal_id: string;
          from_stage_id?: string | null;
          to_stage_id: string;
          from_status?: string | null;
          to_status?: string | null;
          changed_by?: string | null;
          note?: string | null;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["crm_deal_stage_history"]["Insert"]
        >;
        Relationships: [];
      };
      crm_close_reasons: {
        Row: {
          id: string;
          organization_id: string;
          kind: string;
          code: string;
          label: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          kind: string;
          code: string;
          label: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["crm_close_reasons"]["Insert"]
        >;
        Relationships: [];
      };
      crm_automation_events: {
        Row: {
          id: string;
          organization_id: string;
          event_type: string;
          entity_type: string;
          entity_id: string;
          payload_json: Json;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_type: string;
          entity_type: string;
          entity_id: string;
          payload_json?: Json;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["crm_automation_events"]["Insert"]
        >;
        Relationships: [];
      };
      crm_automations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          status: string;
          trigger_type: string;
          trigger_config_json: Json;
          workflow_graph_json: Json;
          definition_json: Json;
          template_code: string | null;
          owner_user_id: string | null;
          current_version: number;
          enabled: boolean;
          channel_plan_json: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          status?: string;
          trigger_type?: string;
          trigger_config_json?: Json;
          workflow_graph_json?: Json;
          definition_json?: Json;
          template_code?: string | null;
          owner_user_id?: string | null;
          current_version?: number;
          enabled?: boolean;
          channel_plan_json?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["crm_automations"]["Insert"]
        >;
        Relationships: [];
      };
      crm_automation_versions: {
        Row: {
          id: string;
          organization_id: string;
          automation_id: string;
          version_number: number;
          status: string;
          name: string;
          description: string | null;
          trigger_type: string;
          trigger_config_json: Json;
          workflow_graph_json: Json;
          definition_json: Json;
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
          automation_id: string;
          version_number: number;
          status?: string;
          name: string;
          description?: string | null;
          trigger_type: string;
          trigger_config_json?: Json;
          workflow_graph_json?: Json;
          definition_json?: Json;
          change_notes?: string | null;
          is_current?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["crm_automation_versions"]["Insert"]
        >;
        Relationships: [];
      };
      crm_automation_runs: {
        Row: {
          id: string;
          organization_id: string;
          automation_id: string;
          version_id: string | null;
          source_event_id: string | null;
          entity_type: string | null;
          entity_id: string | null;
          status: string;
          trigger_type: string | null;
          started_at: string | null;
          finished_at: string | null;
          duration_ms: number | null;
          executed_actions_json: Json;
          context_json: Json;
          error_message: string | null;
          idempotency_key: string | null;
          retry_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          automation_id: string;
          version_id?: string | null;
          source_event_id?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          status?: string;
          trigger_type?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          duration_ms?: number | null;
          executed_actions_json?: Json;
          context_json?: Json;
          error_message?: string | null;
          idempotency_key?: string | null;
          retry_count?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["crm_automation_runs"]["Insert"]
        >;
        Relationships: [];
      };
      crm_automation_run_logs: {
        Row: {
          id: string;
          organization_id: string;
          run_id: string;
          step_key: string | null;
          step_type: string | null;
          level: string;
          message: string;
          result: string | null;
          execution_time_ms: number | null;
          payload_json: Json;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          run_id: string;
          step_key?: string | null;
          step_type?: string | null;
          level?: string;
          message: string;
          result?: string | null;
          execution_time_ms?: number | null;
          payload_json?: Json;
          error_message?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["crm_automation_run_logs"]["Insert"]
        >;
        Relationships: [];
      };
      crm_automation_templates: {
        Row: {
          id: string;
          organization_id: string | null;
          code: string;
          name: string;
          description: string | null;
          category: string;
          trigger_type: string;
          workflow_graph_json: Json;
          definition_json: Json;
          is_system: boolean;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          code: string;
          name: string;
          description?: string | null;
          category?: string;
          trigger_type: string;
          workflow_graph_json?: Json;
          definition_json?: Json;
          is_system?: boolean;
          enabled?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["crm_automation_templates"]["Insert"]
        >;
        Relationships: [];
      };
      crm_executive_reports: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          filters_json: Json;
          layout_json: Json;
          is_favorite: boolean;
          is_default: boolean;
          is_archived: boolean;
          created_by: string | null;
          updated_by: string | null;
          schedule_cron: string | null;
          schedule_enabled: boolean;
          last_exported_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          filters_json?: Json;
          layout_json?: Json;
          is_favorite?: boolean;
          is_default?: boolean;
          is_archived?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          schedule_cron?: string | null;
          schedule_enabled?: boolean;
          last_exported_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["crm_executive_reports"]["Insert"]
        >;
        Relationships: [];
      };
      copilot_conversations: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          title: string;
          status: string;
          mode: string;
          is_pinned: boolean;
          is_favorite: boolean;
          context_json: Json;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          title?: string;
          status?: string;
          mode?: string;
          is_pinned?: boolean;
          is_favorite?: boolean;
          context_json?: Json;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["copilot_conversations"]["Insert"]
        >;
        Relationships: [];
      };
      copilot_messages: {
        Row: {
          id: string;
          organization_id: string;
          conversation_id: string;
          role: string;
          content: string;
          intent: string | null;
          payload_json: Json;
          action_proposals_json: Json;
          provider_code: string | null;
          model: string | null;
          latency_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          conversation_id: string;
          role: string;
          content?: string;
          intent?: string | null;
          payload_json?: Json;
          action_proposals_json?: Json;
          provider_code?: string | null;
          model?: string | null;
          latency_ms?: number | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["copilot_messages"]["Insert"]
        >;
        Relationships: [];
      };
      copilot_prompts: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          code: string | null;
          title: string;
          prompt_text: string;
          category: string;
          is_system: boolean;
          is_favorite: boolean;
          use_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          code?: string | null;
          title: string;
          prompt_text: string;
          category?: string;
          is_system?: boolean;
          is_favorite?: boolean;
          use_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["copilot_prompts"]["Insert"]
        >;
        Relationships: [];
      };
      copilot_action_runs: {
        Row: {
          id: string;
          organization_id: string;
          conversation_id: string | null;
          message_id: string | null;
          user_id: string;
          action_type: string;
          status: string;
          preview_json: Json;
          result_json: Json;
          error_message: string | null;
          confirmed_at: string | null;
          executed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          conversation_id?: string | null;
          message_id?: string | null;
          user_id: string;
          action_type: string;
          status?: string;
          preview_json?: Json;
          result_json?: Json;
          error_message?: string | null;
          confirmed_at?: string | null;
          executed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["copilot_action_runs"]["Insert"]
        >;
        Relationships: [];
      };
      integration_connections: {
        Row: {
          id: string;
          organization_id: string;
          integration_code: string;
          display_name: string | null;
          status: string;
          auth_type: string;
          account_label: string | null;
          external_account_id: string | null;
          scopes_json: Json;
          config_json: Json;
          health_status: string;
          health_message: string | null;
          last_validated_at: string | null;
          last_synced_at: string | null;
          next_sync_at: string | null;
          sync_stats_json: Json;
          installed_by: string | null;
          installed_at: string | null;
          disconnected_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          integration_code: string;
          display_name?: string | null;
          status?: string;
          auth_type?: string;
          account_label?: string | null;
          external_account_id?: string | null;
          scopes_json?: Json;
          config_json?: Json;
          health_status?: string;
          health_message?: string | null;
          last_validated_at?: string | null;
          last_synced_at?: string | null;
          next_sync_at?: string | null;
          sync_stats_json?: Json;
          installed_by?: string | null;
          installed_at?: string | null;
          disconnected_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["integration_connections"]["Insert"]
        >;
        Relationships: [];
      };
      integration_credentials: {
        Row: {
          id: string;
          organization_id: string;
          connection_id: string;
          credential_kind: string;
          ciphertext_base64: string;
          iv_base64: string;
          auth_tag_base64: string;
          key_version: number;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          connection_id: string;
          credential_kind: string;
          ciphertext_base64: string;
          iv_base64: string;
          auth_tag_base64: string;
          key_version?: number;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["integration_credentials"]["Insert"]
        >;
        Relationships: [];
      };
      integration_sync_runs: {
        Row: {
          id: string;
          organization_id: string;
          connection_id: string;
          sync_mode: string;
          status: string;
          direction: string;
          started_at: string | null;
          finished_at: string | null;
          duration_ms: number | null;
          records_imported: number;
          records_exported: number;
          error_count: number;
          warning_count: number;
          error_code: string | null;
          error_message: string | null;
          cursor_json: Json;
          stats_json: Json;
          retry_count: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          connection_id: string;
          sync_mode?: string;
          status?: string;
          direction?: string;
          started_at?: string | null;
          finished_at?: string | null;
          duration_ms?: number | null;
          records_imported?: number;
          records_exported?: number;
          error_count?: number;
          warning_count?: number;
          error_code?: string | null;
          error_message?: string | null;
          cursor_json?: Json;
          stats_json?: Json;
          retry_count?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["integration_sync_runs"]["Insert"]
        >;
        Relationships: [];
      };
      integration_sync_events: {
        Row: {
          id: string;
          organization_id: string;
          sync_run_id: string;
          level: string;
          code: string | null;
          message: string;
          payload_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          sync_run_id: string;
          level?: string;
          code?: string | null;
          message: string;
          payload_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["integration_sync_events"]["Insert"]
        >;
        Relationships: [];
      };
      integration_webhooks: {
        Row: {
          id: string;
          organization_id: string;
          connection_id: string | null;
          direction: string;
          endpoint_url: string | null;
          event_types_json: Json;
          status: string;
          signature_algo: string;
          secret_credential_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          connection_id?: string | null;
          direction: string;
          endpoint_url?: string | null;
          event_types_json?: Json;
          status?: string;
          signature_algo?: string;
          secret_credential_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["integration_webhooks"]["Insert"]
        >;
        Relationships: [];
      };
      integration_webhook_deliveries: {
        Row: {
          id: string;
          organization_id: string;
          webhook_id: string;
          status: string;
          http_status: number | null;
          attempt_count: number;
          error_message: string | null;
          payload_json: Json;
          signature_valid: boolean | null;
          next_retry_at: string | null;
          created_at: string;
          delivered_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          webhook_id: string;
          status?: string;
          http_status?: number | null;
          attempt_count?: number;
          error_message?: string | null;
          payload_json?: Json;
          signature_valid?: boolean | null;
          next_retry_at?: string | null;
          created_at?: string;
          delivered_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["integration_webhook_deliveries"]["Insert"]
        >;
        Relationships: [];
      };
      integration_audit_events: {
        Row: {
          id: string;
          organization_id: string;
          connection_id: string | null;
          actor_user_id: string | null;
          event_type: string;
          message: string;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          connection_id?: string | null;
          actor_user_id?: string | null;
          event_type: string;
          message: string;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["integration_audit_events"]["Insert"]
        >;
        Relationships: [];
      };
      platform_api_keys: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          permission_tier: string;
          scopes_json: Json;
          status: string;
          expires_at: string | null;
          last_used_at: string | null;
          created_by: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          rate_limit_per_minute: number;
          rate_limit_per_day: number;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          permission_tier?: string;
          scopes_json?: Json;
          status?: string;
          expires_at?: string | null;
          last_used_at?: string | null;
          created_by?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          rate_limit_per_minute?: number;
          rate_limit_per_day?: number;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_api_keys"]["Insert"]
        >;
        Relationships: [];
      };
      platform_api_key_rotations: {
        Row: {
          id: string;
          organization_id: string;
          api_key_id: string;
          previous_key_prefix: string;
          rotated_by: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          api_key_id: string;
          previous_key_prefix: string;
          rotated_by?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_api_key_rotations"]["Insert"]
        >;
        Relationships: [];
      };
      platform_api_request_logs: {
        Row: {
          id: string;
          organization_id: string;
          api_key_id: string | null;
          request_id: string;
          method: string;
          path: string;
          status_code: number;
          latency_ms: number | null;
          error_code: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          api_key_id?: string | null;
          request_id: string;
          method: string;
          path: string;
          status_code: number;
          latency_ms?: number | null;
          error_code?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_api_request_logs"]["Insert"]
        >;
        Relationships: [];
      };
      platform_api_usage_daily: {
        Row: {
          id: string;
          organization_id: string;
          api_key_id: string | null;
          usage_date: string;
          request_count: number;
          error_count: number;
          rate_limit_429_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          api_key_id?: string | null;
          usage_date: string;
          request_count?: number;
          error_count?: number;
          rate_limit_429_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_api_usage_daily"]["Insert"]
        >;
        Relationships: [];
      };
      platform_webhooks: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          target_url: string;
          status: string;
          event_types_json: Json;
          secret_ciphertext_base64: string | null;
          secret_iv_base64: string | null;
          secret_auth_tag_base64: string | null;
          secret_key_version: number;
          secret_prefix: string | null;
          https_only: boolean;
          ip_allowlist_json: Json;
          timestamp_tolerance_seconds: number;
          created_by: string | null;
          last_delivery_at: string | null;
          last_success_at: string | null;
          last_failure_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          target_url: string;
          status?: string;
          event_types_json?: Json;
          secret_ciphertext_base64?: string | null;
          secret_iv_base64?: string | null;
          secret_auth_tag_base64?: string | null;
          secret_key_version?: number;
          secret_prefix?: string | null;
          https_only?: boolean;
          ip_allowlist_json?: Json;
          timestamp_tolerance_seconds?: number;
          created_by?: string | null;
          last_delivery_at?: string | null;
          last_success_at?: string | null;
          last_failure_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_webhooks"]["Insert"]
        >;
        Relationships: [];
      };
      platform_webhook_deliveries: {
        Row: {
          id: string;
          organization_id: string;
          webhook_id: string;
          event_type: string;
          event_id: string;
          status: string;
          attempt_count: number;
          http_status: number | null;
          duration_ms: number | null;
          payload_size_bytes: number | null;
          response_body_preview: string | null;
          error_message: string | null;
          next_retry_at: string | null;
          payload_json: Json;
          created_at: string;
          delivered_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          webhook_id: string;
          event_type: string;
          event_id: string;
          status?: string;
          attempt_count?: number;
          http_status?: number | null;
          duration_ms?: number | null;
          payload_size_bytes?: number | null;
          response_body_preview?: string | null;
          error_message?: string | null;
          next_retry_at?: string | null;
          payload_json?: Json;
          created_at?: string;
          delivered_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_webhook_deliveries"]["Insert"]
        >;
        Relationships: [];
      };
      platform_api_audit_events: {
        Row: {
          id: string;
          organization_id: string;
          actor_user_id: string | null;
          api_key_id: string | null;
          event_type: string;
          message: string;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_user_id?: string | null;
          api_key_id?: string | null;
          event_type: string;
          message: string;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_api_audit_events"]["Insert"]
        >;
        Relationships: [];
      };
      platform_event_outbox: {
        Row: {
          id: string;
          organization_id: string;
          event_type: string;
          event_id: string;
          payload_json: Json;
          status: string;
          published_at: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_type: string;
          event_id: string;
          payload_json?: Json;
          status?: string;
          published_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_event_outbox"]["Insert"]
        >;
        Relationships: [];
      };
      organization_white_label: {
        Row: {
          organization_id: string;
          config_json: Json;
          theme_cache_json: Json;
          status: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          config_json?: Json;
          theme_cache_json?: Json;
          status?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["organization_white_label"]["Insert"]
        >;
        Relationships: [];
      };
      organization_white_label_assets: {
        Row: {
          id: string;
          organization_id: string;
          slot: string;
          content_type: string;
          byte_size: number;
          width_px: number | null;
          height_px: number | null;
          public_url: string | null;
          data_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          slot: string;
          content_type: string;
          byte_size?: number;
          width_px?: number | null;
          height_px?: number | null;
          public_url?: string | null;
          data_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["organization_white_label_assets"]["Insert"]
        >;
        Relationships: [];
      };
      organization_custom_domains: {
        Row: {
          id: string;
          organization_id: string;
          hostname: string;
          is_primary: boolean;
          status: string;
          ssl_status: string;
          dns_validation_token: string;
          verified_at: string | null;
          last_checked_at: string | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          hostname: string;
          is_primary?: boolean;
          status?: string;
          ssl_status?: string;
          dns_validation_token: string;
          verified_at?: string | null;
          last_checked_at?: string | null;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["organization_custom_domains"]["Insert"]
        >;
        Relationships: [];
      };
      partner_accounts: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          name: string;
          status: string;
          branding_json: Json;
          stats_json: Json;
          license_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          code: string;
          name: string;
          status?: string;
          branding_json?: Json;
          stats_json?: Json;
          license_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["partner_accounts"]["Insert"]
        >;
        Relationships: [];
      };
      partner_customers: {
        Row: {
          id: string;
          partner_id: string;
          organization_id: string;
          customer_organization_id: string;
          license_status: string;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          organization_id: string;
          customer_organization_id: string;
          license_status?: string;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["partner_customers"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_comments: {
        Row: {
          id: string;
          organization_id: string;
          entity_type: string;
          entity_id: string;
          parent_id: string | null;
          body_html: string;
          body_text: string;
          rich_json: Json;
          is_pinned: boolean;
          is_resolved: boolean;
          resolved_by: string | null;
          resolved_at: string | null;
          edited_at: string | null;
          deleted_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          entity_type: string;
          entity_id: string;
          parent_id?: string | null;
          body_html?: string;
          body_text?: string;
          rich_json?: Json;
          is_pinned?: boolean;
          is_resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          edited_at?: string | null;
          deleted_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_comments"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_mentions: {
        Row: {
          id: string;
          organization_id: string;
          comment_id: string | null;
          note_id: string | null;
          mention_type: string;
          mentioned_user_id: string | null;
          mentioned_team_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          comment_id?: string | null;
          note_id?: string | null;
          mention_type: string;
          mentioned_user_id?: string | null;
          mentioned_team_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_mentions"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_notifications: {
        Row: {
          id: string;
          organization_id: string;
          recipient_user_id: string;
          actor_user_id: string | null;
          event_type: string;
          title: string;
          body: string;
          priority: string;
          entity_type: string | null;
          entity_id: string | null;
          channel_flags: Json;
          is_read: boolean;
          read_at: string | null;
          is_archived: boolean;
          dismissed_at: string | null;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          recipient_user_id: string;
          actor_user_id?: string | null;
          event_type: string;
          title: string;
          body?: string;
          priority?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          channel_flags?: Json;
          is_read?: boolean;
          read_at?: string | null;
          is_archived?: boolean;
          dismissed_at?: string | null;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_notifications"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_attachments: {
        Row: {
          id: string;
          organization_id: string;
          entity_type: string;
          entity_id: string;
          file_name: string;
          content_type: string;
          byte_size: number;
          storage_url: string | null;
          data_url: string | null;
          checksum: string | null;
          virus_scan_status: string;
          version: number;
          preview_ready: boolean;
          uploaded_by: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          entity_type: string;
          entity_id: string;
          file_name: string;
          content_type: string;
          byte_size?: number;
          storage_url?: string | null;
          data_url?: string | null;
          checksum?: string | null;
          virus_scan_status?: string;
          version?: number;
          preview_ready?: boolean;
          uploaded_by?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_attachments"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_teams: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          name: string;
          description: string;
          team_type: string;
          permissions_json: Json;
          pinned_json: Json;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          code: string;
          name: string;
          description?: string;
          team_type?: string;
          permissions_json?: Json;
          pinned_json?: Json;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_teams"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_team_members: {
        Row: {
          id: string;
          organization_id: string;
          team_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          team_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_team_members"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_knowledge_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          description: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          description?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_knowledge_categories"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_knowledge_articles: {
        Row: {
          id: string;
          organization_id: string;
          category_id: string | null;
          title: string;
          slug: string;
          body_html: string;
          body_text: string;
          status: string;
          version: number;
          permissions_json: Json;
          created_by: string | null;
          updated_by: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          category_id?: string | null;
          title: string;
          slug: string;
          body_html?: string;
          body_text?: string;
          status?: string;
          version?: number;
          permissions_json?: Json;
          created_by?: string | null;
          updated_by?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_knowledge_articles"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_shared_notes: {
        Row: {
          id: string;
          organization_id: string;
          team_id: string | null;
          title: string;
          body_html: string;
          body_text: string;
          rich_json: Json;
          is_pinned: boolean;
          version: number;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          team_id?: string | null;
          title: string;
          body_html?: string;
          body_text?: string;
          rich_json?: Json;
          is_pinned?: boolean;
          version?: number;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_shared_notes"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_meetings: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          agenda_html: string;
          notes_html: string;
          scheduled_at: string | null;
          ended_at: string | null;
          participants_json: Json;
          action_items_json: Json;
          linked_company_ids: Json;
          linked_deal_ids: Json;
          linked_contact_ids: Json;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          agenda_html?: string;
          notes_html?: string;
          scheduled_at?: string | null;
          ended_at?: string | null;
          participants_json?: Json;
          action_items_json?: Json;
          linked_company_ids?: Json;
          linked_deal_ids?: Json;
          linked_contact_ids?: Json;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_meetings"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_task_watchers: {
        Row: {
          id: string;
          organization_id: string;
          task_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          task_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_task_watchers"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_task_checklists: {
        Row: {
          id: string;
          organization_id: string;
          task_id: string;
          title: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          task_id: string;
          title?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_task_checklists"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_task_checklist_items: {
        Row: {
          id: string;
          organization_id: string;
          checklist_id: string;
          title: string;
          is_done: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          checklist_id: string;
          title: string;
          is_done?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_task_checklist_items"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_task_dependencies: {
        Row: {
          id: string;
          organization_id: string;
          task_id: string;
          depends_on_task_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          task_id: string;
          depends_on_task_id: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_task_dependencies"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_task_subtasks: {
        Row: {
          id: string;
          organization_id: string;
          parent_task_id: string;
          title: string;
          is_done: boolean;
          sort_order: number;
          assigned_user_id: string | null;
          due_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          parent_task_id: string;
          title: string;
          is_done?: boolean;
          sort_order?: number;
          assigned_user_id?: string | null;
          due_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_task_subtasks"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_favorites: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          entity_type: string;
          entity_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          entity_type: string;
          entity_id: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_favorites"]["Insert"]
        >;
        Relationships: [];
      };
      collaboration_audit_events: {
        Row: {
          id: string;
          organization_id: string;
          actor_user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          description: string;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_user_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          description?: string;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collaboration_audit_events"]["Insert"]
        >;
        Relationships: [];
      };

      security_organization_policies: {
        Row: {
          organization_id: string;
          force_mfa: boolean;
          allow_password_login: boolean;
          allow_passwordless: boolean;
          allow_magic_link: boolean;
          allow_passkeys: boolean;
          allow_oauth: boolean;
          session_timeout_minutes: number;
          idle_timeout_minutes: number;
          max_sessions: number;
          allowed_ip_cidrs: Json;
          allowed_login_hours_json: Json;
          allowed_countries_json: Json;
          password_min_length: number;
          password_require_upper: boolean;
          password_require_lower: boolean;
          password_require_number: boolean;
          password_require_symbol: boolean;
          password_expiration_days: number | null;
          password_history_count: number;
          failed_login_threshold: number;
          lockout_minutes: number;
          remember_device_days: number;
          future_ldap_ready: boolean;
          future_ad_ready: boolean;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          force_mfa?: boolean;
          allow_password_login?: boolean;
          allow_passwordless?: boolean;
          allow_magic_link?: boolean;
          allow_passkeys?: boolean;
          allow_oauth?: boolean;
          session_timeout_minutes?: number;
          idle_timeout_minutes?: number;
          max_sessions?: number;
          allowed_ip_cidrs?: Json;
          allowed_login_hours_json?: Json;
          allowed_countries_json?: Json;
          password_min_length?: number;
          password_require_upper?: boolean;
          password_require_lower?: boolean;
          password_require_number?: boolean;
          password_require_symbol?: boolean;
          password_expiration_days?: number | null;
          password_history_count?: number;
          failed_login_threshold?: number;
          lockout_minutes?: number;
          remember_device_days?: number;
          future_ldap_ready?: boolean;
          future_ad_ready?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["security_organization_policies"]["Insert"]
        >;
        Relationships: [];
      };
      security_sessions: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string;
          session_token_hash: string;
          browser: string | null;
          operating_system: string | null;
          device_name: string | null;
          ip_address: string | null;
          country_code: string | null;
          user_agent: string | null;
          login_at: string;
          last_activity_at: string;
          expires_at: string | null;
          revoked_at: string | null;
          revoke_reason: string | null;
          is_current: boolean;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          user_id: string;
          session_token_hash: string;
          browser?: string | null;
          operating_system?: string | null;
          device_name?: string | null;
          ip_address?: string | null;
          country_code?: string | null;
          user_agent?: string | null;
          login_at?: string;
          last_activity_at?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          revoke_reason?: string | null;
          is_current?: boolean;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["security_sessions"]["Insert"]
        >;
        Relationships: [];
      };
      security_devices: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string;
          device_fingerprint: string;
          device_name: string;
          browser: string | null;
          platform: string | null;
          is_trusted: boolean;
          first_seen_at: string;
          last_used_at: string;
          revoked_at: string | null;
          metadata_json: Json;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          user_id: string;
          device_fingerprint: string;
          device_name?: string;
          browser?: string | null;
          platform?: string | null;
          is_trusted?: boolean;
          first_seen_at?: string;
          last_used_at?: string;
          revoked_at?: string | null;
          metadata_json?: Json;
        };
        Update: Partial<
          Database["public"]["Tables"]["security_devices"]["Insert"]
        >;
        Relationships: [];
      };
      security_mfa_settings: {
        Row: {
          user_id: string;
          organization_id: string | null;
          mfa_enabled: boolean;
          totp_enabled: boolean;
          totp_secret_encrypted: string | null;
          email_backup_enabled: boolean;
          sms_ready: boolean;
          enabled_at: string | null;
          disabled_at: string | null;
          last_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          organization_id?: string | null;
          mfa_enabled?: boolean;
          totp_enabled?: boolean;
          totp_secret_encrypted?: string | null;
          email_backup_enabled?: boolean;
          sms_ready?: boolean;
          enabled_at?: string | null;
          disabled_at?: string | null;
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["security_mfa_settings"]["Insert"]
        >;
        Relationships: [];
      };
      security_mfa_recovery_codes: {
        Row: {
          id: string;
          user_id: string;
          code_hash: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code_hash: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["security_mfa_recovery_codes"]["Insert"]
        >;
        Relationships: [];
      };
      security_sso_providers: {
        Row: {
          id: string;
          organization_id: string;
          provider_type: string;
          display_name: string;
          status: string;
          issuer: string | null;
          client_id: string | null;
          metadata_url: string | null;
          metadata_json: Json;
          attribute_mapping_json: Json;
          enforced: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          provider_type: string;
          display_name: string;
          status?: string;
          issuer?: string | null;
          client_id?: string | null;
          metadata_url?: string | null;
          metadata_json?: Json;
          attribute_mapping_json?: Json;
          enforced?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["security_sso_providers"]["Insert"]
        >;
        Relationships: [];
      };
      security_custom_roles: {
        Row: {
          id: string;
          organization_id: string;
          code: string;
          name: string;
          description: string;
          is_template: boolean;
          inherits_from: string | null;
          permissions_json: Json;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          code: string;
          name: string;
          description?: string;
          is_template?: boolean;
          inherits_from?: string | null;
          permissions_json?: Json;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["security_custom_roles"]["Insert"]
        >;
        Relationships: [];
      };
      security_member_role_assignments: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          custom_role_id: string;
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          custom_role_id: string;
          assigned_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["security_member_role_assignments"]["Insert"]
        >;
        Relationships: [];
      };
      security_login_attempts: {
        Row: {
          id: string;
          organization_id: string | null;
          email: string | null;
          user_id: string | null;
          success: boolean;
          failure_reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
          device_fingerprint: string | null;
          country_code: string | null;
          is_suspicious: boolean;
          suspicion_flags: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          email?: string | null;
          user_id?: string | null;
          success?: boolean;
          failure_reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          device_fingerprint?: string | null;
          country_code?: string | null;
          is_suspicious?: boolean;
          suspicion_flags?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["security_login_attempts"]["Insert"]
        >;
        Relationships: [];
      };
      security_alerts: {
        Row: {
          id: string;
          organization_id: string;
          alert_type: string;
          severity: string;
          title: string;
          body: string;
          entity_type: string | null;
          entity_id: string | null;
          status: string;
          metadata_json: Json;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          alert_type: string;
          severity?: string;
          title: string;
          body?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          status?: string;
          metadata_json?: Json;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["security_alerts"]["Insert"]
        >;
        Relationships: [];
      };
      security_audit_events: {
        Row: {
          id: string;
          organization_id: string | null;
          actor_user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          description: string;
          ip_address: string | null;
          user_agent: string | null;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          actor_user_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          description?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["security_audit_events"]["Insert"]
        >;
        Relationships: [];
      };
      security_account_locks: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          reason: string;
          locked_by: string | null;
          locked_at: string;
          unlock_at: string | null;
          unlocked_at: string | null;
          unlocked_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          reason?: string;
          locked_by?: string | null;
          locked_at?: string;
          unlock_at?: string | null;
          unlocked_at?: string | null;
          unlocked_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["security_account_locks"]["Insert"]
        >;
        Relationships: [];
      };
      security_data_processing_logs: {
        Row: {
          id: string;
          organization_id: string;
          actor_user_id: string | null;
          processing_purpose: string;
          legal_basis: string | null;
          data_categories: Json;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_user_id?: string | null;
          processing_purpose: string;
          legal_basis?: string | null;
          data_categories?: Json;
          description?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["security_data_processing_logs"]["Insert"]
        >;
        Relationships: [];
      };

      billing_plans: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          plan_tier: string;
          billing_interval: string;
          price_cents: number;
          currency: string;
          seat_price_cents: number;
          included_seats: number;
          is_public: boolean;
          is_enterprise_contract: boolean;
          trial_days: number;
          stripe_price_id: string | null;
          stripe_product_id: string | null;
          sort_order: number;
          status: string;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string;
          plan_tier: string;
          billing_interval?: string;
          price_cents?: number;
          currency?: string;
          seat_price_cents?: number;
          included_seats?: number;
          is_public?: boolean;
          is_enterprise_contract?: boolean;
          trial_days?: number;
          stripe_price_id?: string | null;
          stripe_product_id?: string | null;
          sort_order?: number;
          status?: string;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_plans"]["Insert"]
        >;
        Relationships: [];
      };
      billing_plan_limits: {
        Row: {
          id: string;
          plan_id: string;
          limit_key: string;
          limit_value: number;
          soft_limit: number | null;
          warning_threshold_pct: number;
          enforcement: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          limit_key: string;
          limit_value?: number;
          soft_limit?: number | null;
          warning_threshold_pct?: number;
          enforcement?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_plan_limits"]["Insert"]
        >;
        Relationships: [];
      };
      billing_plan_features: {
        Row: {
          id: string;
          plan_id: string;
          feature_key: string;
          enabled: boolean;
        };
        Insert: {
          id?: string;
          plan_id: string;
          feature_key: string;
          enabled?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_plan_features"]["Insert"]
        >;
        Relationships: [];
      };
      billing_addons: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          addon_type: string;
          price_cents: number;
          currency: string;
          quantity_unit: string;
          stripe_price_id: string | null;
          status: string;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string;
          addon_type: string;
          price_cents?: number;
          currency?: string;
          quantity_unit?: string;
          stripe_price_id?: string | null;
          status?: string;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_addons"]["Insert"]
        >;
        Relationships: [];
      };
      billing_coupons: {
        Row: {
          id: string;
          code: string;
          name: string;
          discount_type: string;
          percent_off: number | null;
          amount_off_cents: number | null;
          currency: string;
          duration: string;
          max_redemptions: number | null;
          redeem_by: string | null;
          status: string;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          discount_type: string;
          percent_off?: number | null;
          amount_off_cents?: number | null;
          currency?: string;
          duration?: string;
          max_redemptions?: number | null;
          redeem_by?: string | null;
          status?: string;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_coupons"]["Insert"]
        >;
        Relationships: [];
      };
      billing_customers: {
        Row: {
          organization_id: string;
          stripe_customer_id: string | null;
          billing_email: string | null;
          billing_name: string | null;
          billing_address_json: Json;
          tax_id: string | null;
          vat_number: string | null;
          currency: string;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          stripe_customer_id?: string | null;
          billing_email?: string | null;
          billing_name?: string | null;
          billing_address_json?: Json;
          tax_id?: string | null;
          vat_number?: string | null;
          currency?: string;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_customers"]["Insert"]
        >;
        Relationships: [];
      };
      billing_subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          plan_id: string;
          status: string;
          billing_interval: string;
          seats_purchased: number;
          trial_starts_at: string | null;
          trial_ends_at: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          scheduled_plan_id: string | null;
          stripe_subscription_id: string | null;
          coupon_id: string | null;
          reseller_organization_id: string | null;
          contract_json: Json;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          plan_id: string;
          status?: string;
          billing_interval?: string;
          seats_purchased?: number;
          trial_starts_at?: string | null;
          trial_ends_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          scheduled_plan_id?: string | null;
          stripe_subscription_id?: string | null;
          coupon_id?: string | null;
          reseller_organization_id?: string | null;
          contract_json?: Json;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_subscriptions"]["Insert"]
        >;
        Relationships: [];
      };
      billing_org_addons: {
        Row: {
          id: string;
          organization_id: string;
          addon_id: string;
          quantity: number;
          status: string;
          stripe_subscription_item_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          addon_id: string;
          quantity?: number;
          status?: string;
          stripe_subscription_item_id?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_org_addons"]["Insert"]
        >;
        Relationships: [];
      };
      billing_coupon_redemptions: {
        Row: {
          id: string;
          organization_id: string;
          coupon_id: string;
          redeemed_by: string | null;
          redeemed_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          coupon_id: string;
          redeemed_by?: string | null;
          redeemed_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_coupon_redemptions"]["Insert"]
        >;
        Relationships: [];
      };
      billing_seat_ledger: {
        Row: {
          id: string;
          organization_id: string;
          change_type: string;
          seats_delta: number;
          seats_after: number;
          actor_user_id: string | null;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          change_type: string;
          seats_delta: number;
          seats_after: number;
          actor_user_id?: string | null;
          note?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_seat_ledger"]["Insert"]
        >;
        Relationships: [];
      };
      billing_usage_snapshots: {
        Row: {
          id: string;
          organization_id: string;
          metric_key: string;
          metric_value: number;
          period_start: string;
          period_end: string;
          source: string;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          metric_key: string;
          metric_value?: number;
          period_start: string;
          period_end: string;
          source?: string;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_usage_snapshots"]["Insert"]
        >;
        Relationships: [];
      };
      billing_invoices: {
        Row: {
          id: string;
          organization_id: string;
          stripe_invoice_id: string | null;
          number: string | null;
          status: string;
          currency: string;
          amount_due_cents: number;
          amount_paid_cents: number;
          tax_cents: number;
          period_start: string | null;
          period_end: string | null;
          hosted_invoice_url: string | null;
          invoice_pdf_url: string | null;
          due_at: string | null;
          paid_at: string | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          stripe_invoice_id?: string | null;
          number?: string | null;
          status?: string;
          currency?: string;
          amount_due_cents?: number;
          amount_paid_cents?: number;
          tax_cents?: number;
          period_start?: string | null;
          period_end?: string | null;
          hosted_invoice_url?: string | null;
          invoice_pdf_url?: string | null;
          due_at?: string | null;
          paid_at?: string | null;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_invoices"]["Insert"]
        >;
        Relationships: [];
      };
      billing_payment_methods: {
        Row: {
          id: string;
          organization_id: string;
          stripe_payment_method_id: string | null;
          method_type: string;
          brand: string | null;
          last4: string | null;
          exp_month: number | null;
          exp_year: number | null;
          is_default: boolean;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          stripe_payment_method_id?: string | null;
          method_type?: string;
          brand?: string | null;
          last4?: string | null;
          exp_month?: number | null;
          exp_year?: number | null;
          is_default?: boolean;
          status?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_payment_methods"]["Insert"]
        >;
        Relationships: [];
      };
      billing_notifications: {
        Row: {
          id: string;
          organization_id: string;
          notification_type: string;
          title: string;
          body: string;
          is_read: boolean;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          notification_type: string;
          title: string;
          body?: string;
          is_read?: boolean;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_notifications"]["Insert"]
        >;
        Relationships: [];
      };
      billing_stripe_events: {
        Row: {
          id: string;
          stripe_event_id: string;
          event_type: string;
          organization_id: string | null;
          payload_json: Json;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          stripe_event_id: string;
          event_type: string;
          organization_id?: string | null;
          payload_json?: Json;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_stripe_events"]["Insert"]
        >;
        Relationships: [];
      };
      billing_audit_events: {
        Row: {
          id: string;
          organization_id: string;
          actor_user_id: string | null;
          action: string;
          description: string;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_user_id?: string | null;
          action: string;
          description?: string;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["billing_audit_events"]["Insert"]
        >;
        Relationships: [];
      };

      platform_admins: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          display_name: string;
          platform_role: string;
          status: string;
          permissions_json: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          display_name?: string;
          platform_role?: string;
          status?: string;
          permissions_json?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_admins"]["Insert"]
        >;
        Relationships: [];
      };
      platform_user_controls: {
        Row: {
          user_id: string;
          email: string | null;
          full_name: string | null;
          status: string;
          country: string | null;
          last_login_at: string | null;
          force_password_reset: boolean;
          mfa_disabled_by_admin: boolean;
          notes: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email?: string | null;
          full_name?: string | null;
          status?: string;
          country?: string | null;
          last_login_at?: string | null;
          force_password_reset?: boolean;
          mfa_disabled_by_admin?: boolean;
          notes?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_user_controls"]["Insert"]
        >;
        Relationships: [];
      };
      platform_licenses: {
        Row: {
          id: string;
          organization_id: string;
          license_type: string;
          seats: number;
          status: string;
          starts_at: string | null;
          ends_at: string | null;
          contract_reference: string | null;
          metadata_json: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          license_type: string;
          seats?: number;
          status?: string;
          starts_at?: string | null;
          ends_at?: string | null;
          contract_reference?: string | null;
          metadata_json?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_licenses"]["Insert"]
        >;
        Relationships: [];
      };
      platform_feature_flags: {
        Row: {
          id: string;
          flag_key: string;
          name: string;
          description: string;
          scope: string;
          enabled: boolean;
          emergency_disabled: boolean;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          flag_key: string;
          name: string;
          description?: string;
          scope?: string;
          enabled?: boolean;
          emergency_disabled?: boolean;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_feature_flags"]["Insert"]
        >;
        Relationships: [];
      };
      platform_feature_flag_overrides: {
        Row: {
          id: string;
          flag_id: string;
          organization_id: string;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          flag_id: string;
          organization_id: string;
          enabled: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_feature_flag_overrides"]["Insert"]
        >;
        Relationships: [];
      };
      platform_announcements: {
        Row: {
          id: string;
          title: string;
          body: string;
          announcement_type: string;
          target_scope: string;
          target_json: Json;
          status: string;
          published_at: string | null;
          expires_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body?: string;
          announcement_type?: string;
          target_scope?: string;
          target_json?: Json;
          status?: string;
          published_at?: string | null;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_announcements"]["Insert"]
        >;
        Relationships: [];
      };
      platform_impersonation_sessions: {
        Row: {
          id: string;
          admin_user_id: string;
          target_organization_id: string;
          target_user_id: string | null;
          mode: string;
          reason: string;
          started_at: string;
          expires_at: string;
          ended_at: string | null;
          ip_address: string | null;
          user_agent: string | null;
          metadata_json: Json;
        };
        Insert: {
          id?: string;
          admin_user_id: string;
          target_organization_id: string;
          target_user_id?: string | null;
          mode?: string;
          reason: string;
          started_at?: string;
          expires_at: string;
          ended_at?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata_json?: Json;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_impersonation_sessions"]["Insert"]
        >;
        Relationships: [];
      };
      platform_audit_events: {
        Row: {
          id: string;
          admin_user_id: string | null;
          admin_email: string | null;
          action: string;
          affected_organization_id: string | null;
          affected_user_id: string | null;
          old_value_json: Json;
          new_value_json: Json;
          ip_address: string | null;
          user_agent: string | null;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_user_id?: string | null;
          admin_email?: string | null;
          action: string;
          affected_organization_id?: string | null;
          affected_user_id?: string | null;
          old_value_json?: Json;
          new_value_json?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          description?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_audit_events"]["Insert"]
        >;
        Relationships: [];
      };
      platform_notifications: {
        Row: {
          id: string;
          notification_type: string;
          title: string;
          body: string;
          severity: string;
          is_read: boolean;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          notification_type: string;
          title: string;
          body?: string;
          severity?: string;
          is_read?: boolean;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_notifications"]["Insert"]
        >;
        Relationships: [];
      };
      platform_settings: {
        Row: {
          key: string;
          value_json: Json;
          description: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value_json?: Json;
          description?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_settings"]["Insert"]
        >;
        Relationships: [];
      };
      platform_backup_jobs: {
        Row: {
          id: string;
          organization_id: string | null;
          job_type: string;
          status: string;
          requested_by: string | null;
          artifact_uri: string | null;
          error_message: string | null;
          metadata_json: Json;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          job_type: string;
          status?: string;
          requested_by?: string | null;
          artifact_uri?: string | null;
          error_message?: string | null;
          metadata_json?: Json;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["platform_backup_jobs"]["Insert"]
        >;
        Relationships: [];
      };

      pwa_push_subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          device_label: string;
          enabled: boolean;
          last_seen_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          device_label?: string;
          enabled?: boolean;
          last_seen_at?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["pwa_push_subscriptions"]["Insert"]
        >;
        Relationships: [];
      };
      pwa_offline_sync_queue: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          client_id: string;
          action_type: string;
          payload_json: Json;
          status: string;
          error_message: string | null;
          conflict_json: Json;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          client_id: string;
          action_type: string;
          payload_json?: Json;
          status?: string;
          error_message?: string | null;
          conflict_json?: Json;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["pwa_offline_sync_queue"]["Insert"]
        >;
        Relationships: [];
      };
      pwa_notification_preferences: {
        Row: {
          user_id: string;
          organization_id: string;
          notification_type: string;
          push_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          organization_id: string;
          notification_type: string;
          push_enabled?: boolean;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["pwa_notification_preferences"]["Insert"]
        >;
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
          task_type: string;
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
          task_type?: string;
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
          health_score: number | null;
          quality_score: number | null;
          intelligence_confidence: number | null;
          intelligence_status: string | null;
          intelligence_analyzed_at: string | null;
          intelligence_needs_review: boolean;
          is_decision_maker: boolean;
          department: string | null;
          management_level: string | null;
          decision_maker_level: string | null;
          preferred_channel: string | null;
          primary_language: string | null;
          country: string | null;
          badges_json: Json;
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
          health_score?: number | null;
          quality_score?: number | null;
          intelligence_confidence?: number | null;
          intelligence_status?: string | null;
          intelligence_analyzed_at?: string | null;
          intelligence_needs_review?: boolean;
          is_decision_maker?: boolean;
          department?: string | null;
          management_level?: string | null;
          decision_maker_level?: string | null;
          preferred_channel?: string | null;
          primary_language?: string | null;
          country?: string | null;
          badges_json?: Json;
        };
        Update: Partial<
          Database["public"]["Tables"]["crm_lead_contacts"]["Insert"]
        >;
        Relationships: [];
      };
      contact_intelligence_profiles: {
        Row: {
          id: string;
          organization_id: string;
          contact_id: string;
          lead_id: string;
          status: string;
          summary_json: Json;
          profile_json: Json;
          decision_maker_json: Json;
          communication_json: Json;
          health_json: Json;
          quality_json: Json;
          timeline_json: Json;
          insights_json: Json;
          recommendations_json: Json;
          badges_json: Json;
          signals_json: Json;
          health_score: number;
          quality_score: number;
          confidence: number;
          needs_review: boolean;
          provider: string | null;
          model: string | null;
          analyzed_by: string;
          source: string;
          actor_user_id: string | null;
          error_message: string | null;
          analyzed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          contact_id: string;
          lead_id: string;
          status?: string;
          summary_json?: Json;
          profile_json?: Json;
          decision_maker_json?: Json;
          communication_json?: Json;
          health_json?: Json;
          quality_json?: Json;
          timeline_json?: Json;
          insights_json?: Json;
          recommendations_json?: Json;
          badges_json?: Json;
          signals_json?: Json;
          health_score?: number;
          quality_score?: number;
          confidence?: number;
          needs_review?: boolean;
          provider?: string | null;
          model?: string | null;
          analyzed_by?: string;
          source?: string;
          actor_user_id?: string | null;
          error_message?: string | null;
          analyzed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["contact_intelligence_profiles"]["Insert"]
        >;
        Relationships: [];
      };
      contact_intelligence_runs: {
        Row: {
          id: string;
          organization_id: string;
          contact_id: string;
          lead_id: string;
          profile_id: string | null;
          status: string;
          input_summary_json: Json;
          output_json: Json;
          error_message: string | null;
          provider: string | null;
          model: string | null;
          duration_ms: number | null;
          actor_user_id: string | null;
          source: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          contact_id: string;
          lead_id: string;
          profile_id?: string | null;
          status?: string;
          input_summary_json?: Json;
          output_json?: Json;
          error_message?: string | null;
          provider?: string | null;
          model?: string | null;
          duration_ms?: number | null;
          actor_user_id?: string | null;
          source?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["contact_intelligence_runs"]["Insert"]
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
          builder_mode: string;
          workflow_graph_json: Json;
          calendar_metadata_json: Json;
          ai_brief_json: Json;
          scheduled_for: string | null;
          timezone: string | null;
          tags: string[];
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
          builder_mode?: string;
          workflow_graph_json?: Json;
          calendar_metadata_json?: Json;
          ai_brief_json?: Json;
          scheduled_for?: string | null;
          timezone?: string | null;
          tags?: string[];
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
      email_campaign_ab_tests: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string;
          name: string;
          status: string;
          test_dimension: string;
          metric: string;
          traffic_split_json: Json;
          winner_variant_id: string | null;
          auto_pick_winner: boolean;
          started_at: string | null;
          ended_at: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id: string;
          name: string;
          status?: string;
          test_dimension?: string;
          metric?: string;
          traffic_split_json?: Json;
          winner_variant_id?: string | null;
          auto_pick_winner?: boolean;
          started_at?: string | null;
          ended_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_campaign_ab_tests"]["Insert"]
        >;
        Relationships: [];
      };
      email_campaign_ab_variants: {
        Row: {
          id: string;
          organization_id: string;
          ab_test_id: string;
          label: string;
          weight: number;
          subject: string | null;
          preview_text: string | null;
          html_body: string | null;
          text_body: string | null;
          cta_label: string | null;
          sender_name_override: string | null;
          send_time_override: string | null;
          template_version_id: string | null;
          ai_generation_variant_id: string | null;
          is_control: boolean;
          metrics_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          ab_test_id: string;
          label: string;
          weight?: number;
          subject?: string | null;
          preview_text?: string | null;
          html_body?: string | null;
          text_body?: string | null;
          cta_label?: string | null;
          sender_name_override?: string | null;
          send_time_override?: string | null;
          template_version_id?: string | null;
          ai_generation_variant_id?: string | null;
          is_control?: boolean;
          metrics_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_campaign_ab_variants"]["Insert"]
        >;
        Relationships: [];
      };
      email_campaign_ab_assignments: {
        Row: {
          id: string;
          organization_id: string;
          ab_test_id: string;
          variant_id: string;
          enrollment_id: string | null;
          recipient_snapshot_id: string | null;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          ab_test_id: string;
          variant_id: string;
          enrollment_id?: string | null;
          recipient_snapshot_id?: string | null;
          assigned_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_campaign_ab_assignments"]["Insert"]
        >;
        Relationships: [];
      };
      email_ai_subject_scores: {
        Row: {
          id: string;
          organization_id: string;
          subject: string;
          generation_id: string | null;
          generation_variant_id: string | null;
          ab_variant_id: string | null;
          campaign_id: string | null;
          open_rate_score: number;
          spam_risk_score: number;
          professional_tone_score: number;
          urgency_score: number;
          personalization_score: number;
          overall_score: number;
          rationale_json: Json;
          model: string | null;
          provider: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          subject: string;
          generation_id?: string | null;
          generation_variant_id?: string | null;
          ab_variant_id?: string | null;
          campaign_id?: string | null;
          open_rate_score?: number;
          spam_risk_score?: number;
          professional_tone_score?: number;
          urgency_score?: number;
          personalization_score?: number;
          overall_score?: number;
          rationale_json?: Json;
          model?: string | null;
          provider?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_ai_subject_scores"]["Insert"]
        >;
        Relationships: [];
      };
      email_campaign_channel_plans: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string;
          channel: string;
          enabled: boolean;
          settings_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id: string;
          channel: string;
          enabled?: boolean;
          settings_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_campaign_channel_plans"]["Insert"]
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
          workflow_graph_json: Json;
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
          workflow_graph_json?: Json;
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
          workflow_graph_json: Json;
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
          workflow_graph_json?: Json;
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
      ai_org_settings: {
        Row: {
          organization_id: string;
          default_provider: string;
          default_model: string;
          failover_providers: Json;
          approval_mode: string;
          max_tokens_per_request: number;
          monthly_budget_usd: number | null;
          memory_enabled: boolean;
          logging_enabled: boolean;
          security_strict: boolean;
          rate_limit_per_minute: number;
          prompt_policy_json: Json;
          tool_policy_json: Json;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          default_provider?: string;
          default_model?: string;
          failover_providers?: Json;
          approval_mode?: string;
          max_tokens_per_request?: number;
          monthly_budget_usd?: number | null;
          memory_enabled?: boolean;
          logging_enabled?: boolean;
          security_strict?: boolean;
          rate_limit_per_minute?: number;
          prompt_policy_json?: Json;
          tool_policy_json?: Json;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ai_org_settings"]["Insert"]
        >;
        Relationships: [];
      };
      ai_agents: {
        Row: {
          id: string;
          organization_id: string;
          slug: string;
          name: string;
          description: string;
          version: string;
          status: string;
          owner_user_id: string | null;
          capabilities_json: Json;
          tools_json: Json;
          permissions_json: Json;
          provider: string;
          model: string;
          temperature: number;
          max_tokens: number;
          timeout_ms: number;
          retry_policy_json: Json;
          approval_mode: string;
          logging_enabled: boolean;
          system_prompt: string;
          is_system: boolean;
          deleted_at: string | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          slug: string;
          name: string;
          description?: string;
          version?: string;
          status?: string;
          owner_user_id?: string | null;
          capabilities_json?: Json;
          tools_json?: Json;
          permissions_json?: Json;
          provider?: string;
          model?: string;
          temperature?: number;
          max_tokens?: number;
          timeout_ms?: number;
          retry_policy_json?: Json;
          approval_mode?: string;
          logging_enabled?: boolean;
          system_prompt?: string;
          is_system?: boolean;
          deleted_at?: string | null;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_agents"]["Insert"]>;
        Relationships: [];
      };
      ai_runs: {
        Row: {
          id: string;
          organization_id: string;
          agent_id: string;
          initiated_by: string | null;
          status: string;
          input_text: string;
          input_json: Json;
          output_text: string | null;
          output_json: Json;
          plan_json: Json;
          error_message: string | null;
          provider: string | null;
          model: string | null;
          tokens_in: number;
          tokens_out: number;
          cost_usd: number;
          latency_ms: number;
          approval_status: string | null;
          started_at: string | null;
          completed_at: string | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          agent_id: string;
          initiated_by?: string | null;
          status?: string;
          input_text?: string;
          input_json?: Json;
          output_text?: string | null;
          output_json?: Json;
          plan_json?: Json;
          error_message?: string | null;
          provider?: string | null;
          model?: string | null;
          tokens_in?: number;
          tokens_out?: number;
          cost_usd?: number;
          latency_ms?: number;
          approval_status?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_runs"]["Insert"]>;
        Relationships: [];
      };
      ai_tasks: {
        Row: {
          id: string;
          organization_id: string;
          run_id: string;
          parent_task_id: string | null;
          queue_name: string;
          title: string;
          status: string;
          priority: number;
          depends_on_json: Json;
          input_json: Json;
          output_json: Json;
          tool_name: string | null;
          attempt: number;
          max_attempts: number;
          scheduled_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          timeout_ms: number;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          run_id: string;
          parent_task_id?: string | null;
          queue_name?: string;
          title: string;
          status?: string;
          priority?: number;
          depends_on_json?: Json;
          input_json?: Json;
          output_json?: Json;
          tool_name?: string | null;
          attempt?: number;
          max_attempts?: number;
          scheduled_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          timeout_ms?: number;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_tasks"]["Insert"]>;
        Relationships: [];
      };
      ai_memory_entries: {
        Row: {
          id: string;
          organization_id: string;
          memory_scope: string;
          scope_key: string;
          agent_id: string | null;
          run_id: string | null;
          user_id: string | null;
          company_id: string | null;
          content: string;
          summary: string | null;
          rank_score: number;
          embedding_json: Json;
          expires_at: string | null;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          memory_scope: string;
          scope_key?: string;
          agent_id?: string | null;
          run_id?: string | null;
          user_id?: string | null;
          company_id?: string | null;
          content: string;
          summary?: string | null;
          rank_score?: number;
          embedding_json?: Json;
          expires_at?: string | null;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ai_memory_entries"]["Insert"]
        >;
        Relationships: [];
      };
      ai_knowledge_documents: {
        Row: {
          id: string;
          organization_id: string;
          source_type: string;
          title: string;
          body: string;
          source_ref: string | null;
          tags_json: Json;
          chunk_index: number;
          embedding_json: Json;
          is_active: boolean;
          deleted_at: string | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          source_type: string;
          title: string;
          body?: string;
          source_ref?: string | null;
          tags_json?: Json;
          chunk_index?: number;
          embedding_json?: Json;
          is_active?: boolean;
          deleted_at?: string | null;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ai_knowledge_documents"]["Insert"]
        >;
        Relationships: [];
      };
      ai_prompt_templates: {
        Row: {
          id: string;
          organization_id: string;
          slug: string;
          name: string;
          category: string;
          version: number;
          locale: string;
          template_body: string;
          variables_json: Json;
          parent_slug: string | null;
          ab_variant: string | null;
          is_active: boolean;
          deleted_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          slug: string;
          name: string;
          category?: string;
          version?: number;
          locale?: string;
          template_body: string;
          variables_json?: Json;
          parent_slug?: string | null;
          ab_variant?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ai_prompt_templates"]["Insert"]
        >;
        Relationships: [];
      };
      ai_tool_definitions: {
        Row: {
          id: string;
          organization_id: string | null;
          tool_key: string;
          name: string;
          description: string;
          version: string;
          input_schema_json: Json;
          output_schema_json: Json;
          required_permissions_json: Json;
          timeout_ms: number;
          retry_count: number;
          logging_enabled: boolean;
          is_system: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          tool_key: string;
          name: string;
          description?: string;
          version?: string;
          input_schema_json?: Json;
          output_schema_json?: Json;
          required_permissions_json?: Json;
          timeout_ms?: number;
          retry_count?: number;
          logging_enabled?: boolean;
          is_system?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ai_tool_definitions"]["Insert"]
        >;
        Relationships: [];
      };
      ai_approvals: {
        Row: {
          id: string;
          organization_id: string;
          run_id: string;
          task_id: string | null;
          requested_by: string | null;
          reviewed_by: string | null;
          status: string;
          action_summary: string;
          payload_json: Json;
          review_note: string | null;
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          run_id: string;
          task_id?: string | null;
          requested_by?: string | null;
          reviewed_by?: string | null;
          status?: string;
          action_summary?: string;
          payload_json?: Json;
          review_note?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["ai_approvals"]["Insert"]>;
        Relationships: [];
      };
      ai_cost_ledger: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          agent_id: string | null;
          run_id: string | null;
          provider: string;
          model: string;
          tokens_in: number;
          tokens_out: number;
          cost_usd: number;
          day_key: string;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          agent_id?: string | null;
          run_id?: string | null;
          provider: string;
          model: string;
          tokens_in?: number;
          tokens_out?: number;
          cost_usd?: number;
          day_key?: string;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ai_cost_ledger"]["Insert"]
        >;
        Relationships: [];
      };
      ai_events: {
        Row: {
          id: string;
          organization_id: string;
          event_type: string;
          agent_id: string | null;
          run_id: string | null;
          task_id: string | null;
          payload_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_type: string;
          agent_id?: string | null;
          run_id?: string | null;
          task_id?: string | null;
          payload_json?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_events"]["Insert"]>;
        Relationships: [];
      };
      ai_execution_logs: {
        Row: {
          id: string;
          organization_id: string;
          run_id: string | null;
          task_id: string | null;
          agent_id: string | null;
          user_id: string | null;
          provider: string | null;
          model: string | null;
          tool_name: string | null;
          input_preview: string;
          output_preview: string;
          tokens_in: number;
          tokens_out: number;
          cost_usd: number;
          latency_ms: number;
          approval_status: string | null;
          error_message: string | null;
          security_flags_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          run_id?: string | null;
          task_id?: string | null;
          agent_id?: string | null;
          user_id?: string | null;
          provider?: string | null;
          model?: string | null;
          tool_name?: string | null;
          input_preview?: string;
          output_preview?: string;
          tokens_in?: number;
          tokens_out?: number;
          cost_usd?: number;
          latency_ms?: number;
          approval_status?: string | null;
          error_message?: string | null;
          security_flags_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ai_execution_logs"]["Insert"]
        >;
        Relationships: [];
      };
      ai_workflows: {
        Row: {
          id: string;
          organization_id: string;
          slug: string;
          name: string;
          description: string;
          definition_json: Json;
          status: string;
          deleted_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          slug: string;
          name: string;
          description?: string;
          definition_json?: Json;
          status?: string;
          deleted_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_workflows"]["Insert"]>;
        Relationships: [];
      };
      prospecting_org_settings: {
        Row: {
          organization_id: string;
          enabled: boolean;
          min_lead_score: number;
          min_ai_confidence: number;
          auto_enrich: boolean;
          auto_crm_suggest: boolean;
          approval_mode: string;
          provider: string;
          model: string;
          rate_limit_per_minute: number;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          enabled?: boolean;
          min_lead_score?: number;
          min_ai_confidence?: number;
          auto_enrich?: boolean;
          auto_crm_suggest?: boolean;
          approval_mode?: string;
          provider?: string;
          model?: string;
          rate_limit_per_minute?: number;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["prospecting_org_settings"]["Insert"]
        >;
        Relationships: [];
      };
      prospecting_searches: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          status: string;
          industry: string | null;
          industries_json: Json;
          country: string | null;
          region: string | null;
          city: string | null;
          company_size: string | null;
          employee_band: string | null;
          revenue_band: string | null;
          technology: string | null;
          tags_json: Json;
          keywords_json: Json;
          keyword: string | null;
          min_lead_score: number | null;
          created_by: string | null;
          deleted_at: string | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          status?: string;
          industry?: string | null;
          industries_json?: Json;
          country?: string | null;
          region?: string | null;
          city?: string | null;
          company_size?: string | null;
          employee_band?: string | null;
          revenue_band?: string | null;
          technology?: string | null;
          tags_json?: Json;
          keywords_json?: Json;
          keyword?: string | null;
          min_lead_score?: number | null;
          created_by?: string | null;
          deleted_at?: string | null;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["prospecting_searches"]["Insert"]
        >;
        Relationships: [];
      };
      prospecting_prospects: {
        Row: {
          id: string;
          organization_id: string;
          search_id: string | null;
          company_id: string | null;
          crm_lead_id: string | null;
          company_name: string;
          normalized_name: string;
          website_url: string | null;
          normalized_domain: string | null;
          industry: string | null;
          business_class: string | null;
          country: string | null;
          region: string | null;
          city: string | null;
          company_size: string | null;
          employee_band: string | null;
          revenue_band: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          description: string | null;
          social_json: Json;
          technologies_json: Json;
          tags_json: Json;
          analysis_json: Json;
          enrichment_json: Json;
          opportunities_json: Json;
          decision_makers_json: Json;
          research_summary: string | null;
          lead_score: number;
          lead_quality: string;
          ai_confidence: number;
          recommendation: string;
          status: string;
          duplicate_of_prospect_id: string | null;
          is_duplicate: boolean;
          source: string;
          last_researched_at: string | null;
          last_scored_at: string | null;
          provider: string | null;
          model: string | null;
          tokens_in: number;
          tokens_out: number;
          cost_usd: number;
          created_by: string | null;
          deleted_at: string | null;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          search_id?: string | null;
          company_id?: string | null;
          crm_lead_id?: string | null;
          company_name: string;
          normalized_name?: string;
          website_url?: string | null;
          normalized_domain?: string | null;
          industry?: string | null;
          business_class?: string | null;
          country?: string | null;
          region?: string | null;
          city?: string | null;
          company_size?: string | null;
          employee_band?: string | null;
          revenue_band?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          description?: string | null;
          social_json?: Json;
          technologies_json?: Json;
          tags_json?: Json;
          analysis_json?: Json;
          enrichment_json?: Json;
          opportunities_json?: Json;
          decision_makers_json?: Json;
          research_summary?: string | null;
          lead_score?: number;
          lead_quality?: string;
          ai_confidence?: number;
          recommendation?: string;
          status?: string;
          duplicate_of_prospect_id?: string | null;
          is_duplicate?: boolean;
          source?: string;
          last_researched_at?: string | null;
          last_scored_at?: string | null;
          provider?: string | null;
          model?: string | null;
          tokens_in?: number;
          tokens_out?: number;
          cost_usd?: number;
          created_by?: string | null;
          deleted_at?: string | null;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["prospecting_prospects"]["Insert"]
        >;
        Relationships: [];
      };
      prospecting_research_runs: {
        Row: {
          id: string;
          organization_id: string;
          prospect_id: string;
          agent_id: string | null;
          ai_run_id: string | null;
          status: string;
          stage: string;
          input_json: Json;
          output_json: Json;
          error_message: string | null;
          provider: string | null;
          model: string | null;
          tokens_in: number;
          tokens_out: number;
          cost_usd: number;
          latency_ms: number;
          started_at: string | null;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          prospect_id: string;
          agent_id?: string | null;
          ai_run_id?: string | null;
          status?: string;
          stage?: string;
          input_json?: Json;
          output_json?: Json;
          error_message?: string | null;
          provider?: string | null;
          model?: string | null;
          tokens_in?: number;
          tokens_out?: number;
          cost_usd?: number;
          latency_ms?: number;
          started_at?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["prospecting_research_runs"]["Insert"]
        >;
        Relationships: [];
      };
      prospecting_history_events: {
        Row: {
          id: string;
          organization_id: string;
          prospect_id: string | null;
          search_id: string | null;
          research_run_id: string | null;
          event_type: string;
          actor_user_id: string | null;
          summary: string;
          payload_json: Json;
          provider: string | null;
          model: string | null;
          cost_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          prospect_id?: string | null;
          search_id?: string | null;
          research_run_id?: string | null;
          event_type: string;
          actor_user_id?: string | null;
          summary?: string;
          payload_json?: Json;
          provider?: string | null;
          model?: string | null;
          cost_usd?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["prospecting_history_events"]["Insert"]
        >;
        Relationships: [];
      };
      prospecting_bulk_jobs: {
        Row: {
          id: string;
          organization_id: string;
          job_type: string;
          status: string;
          total_count: number;
          success_count: number;
          failure_count: number;
          input_json: Json;
          result_json: Json;
          error_message: string | null;
          created_by: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          job_type: string;
          status?: string;
          total_count?: number;
          success_count?: number;
          failure_count?: number;
          input_json?: Json;
          result_json?: Json;
          error_message?: string | null;
          created_by?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["prospecting_bulk_jobs"]["Insert"]
        >;
        Relationships: [];
      };
      sales_agent_org_settings: {
        Row: {
          organization_id: string;
          enabled: boolean;
          approval_mode: string;
          provider: string;
          model: string;
          forecast_sensitivity: number;
          risk_threshold: number;
          reminder_frequency_hours: number;
          working_hours_start: number;
          working_hours_end: number;
          timezone: string;
          notification_rules_json: Json;
          rate_limit_per_minute: number;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          enabled?: boolean;
          approval_mode?: string;
          provider?: string;
          model?: string;
          forecast_sensitivity?: number;
          risk_threshold?: number;
          reminder_frequency_hours?: number;
          working_hours_start?: number;
          working_hours_end?: number;
          timezone?: string;
          notification_rules_json?: Json;
          rate_limit_per_minute?: number;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["sales_agent_org_settings"]["Insert"]
        >;
        Relationships: [];
      };
      sales_agent_deal_insights: {
        Row: {
          id: string;
          organization_id: string;
          deal_id: string;
          priority_score: number;
          closing_probability: number;
          expected_revenue: number;
          risk_level: string;
          risk_score: number;
          predicted_close_date: string | null;
          next_best_action: string;
          obstacles_json: Json;
          missed_activities_json: Json;
          coach_tips_json: Json;
          opportunities_json: Json;
          analysis_json: Json;
          ai_confidence: number;
          provider: string | null;
          model: string | null;
          analyzed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          deal_id: string;
          priority_score?: number;
          closing_probability?: number;
          expected_revenue?: number;
          risk_level?: string;
          risk_score?: number;
          predicted_close_date?: string | null;
          next_best_action?: string;
          obstacles_json?: Json;
          missed_activities_json?: Json;
          coach_tips_json?: Json;
          opportunities_json?: Json;
          analysis_json?: Json;
          ai_confidence?: number;
          provider?: string | null;
          model?: string | null;
          analyzed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["sales_agent_deal_insights"]["Insert"]
        >;
        Relationships: [];
      };
      sales_agent_daily_briefings: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          briefing_date: string;
          greeting: string;
          summary_json: Json;
          priorities_json: Json;
          follow_ups_count: number;
          high_risk_count: number;
          new_opportunities_count: number;
          waiting_reply_count: number;
          expiring_quotes_count: number;
          provider: string | null;
          model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          briefing_date?: string;
          greeting?: string;
          summary_json?: Json;
          priorities_json?: Json;
          follow_ups_count?: number;
          high_risk_count?: number;
          new_opportunities_count?: number;
          waiting_reply_count?: number;
          expiring_quotes_count?: number;
          provider?: string | null;
          model?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["sales_agent_daily_briefings"]["Insert"]
        >;
        Relationships: [];
      };
      sales_agent_forecast_snapshots: {
        Row: {
          id: string;
          organization_id: string;
          period_type: string;
          period_key: string;
          forecast_revenue: number;
          pipeline_revenue: number;
          weighted_revenue: number;
          target_revenue: number | null;
          target_hit_probability: number | null;
          confidence: number;
          breakdown_json: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          period_type: string;
          period_key: string;
          forecast_revenue?: number;
          pipeline_revenue?: number;
          weighted_revenue?: number;
          target_revenue?: number | null;
          target_hit_probability?: number | null;
          confidence?: number;
          breakdown_json?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["sales_agent_forecast_snapshots"]["Insert"]
        >;
        Relationships: [];
      };
      sales_agent_meeting_briefs: {
        Row: {
          id: string;
          organization_id: string;
          deal_id: string | null;
          lead_id: string | null;
          company_id: string | null;
          title: string;
          meeting_at: string | null;
          brief_json: Json;
          summary_json: Json;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          deal_id?: string | null;
          lead_id?: string | null;
          company_id?: string | null;
          title: string;
          meeting_at?: string | null;
          brief_json?: Json;
          summary_json?: Json;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["sales_agent_meeting_briefs"]["Insert"]
        >;
        Relationships: [];
      };
      sales_agent_email_drafts: {
        Row: {
          id: string;
          organization_id: string;
          deal_id: string | null;
          lead_id: string | null;
          template_type: string;
          subject: string;
          body_text: string;
          status: string;
          provider: string | null;
          model: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          deal_id?: string | null;
          lead_id?: string | null;
          template_type: string;
          subject?: string;
          body_text?: string;
          status?: string;
          provider?: string | null;
          model?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["sales_agent_email_drafts"]["Insert"]
        >;
        Relationships: [];
      };
      sales_agent_history_events: {
        Row: {
          id: string;
          organization_id: string;
          deal_id: string | null;
          event_type: string;
          actor_user_id: string | null;
          summary: string;
          payload_json: Json;
          provider: string | null;
          model: string | null;
          cost_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          deal_id?: string | null;
          event_type: string;
          actor_user_id?: string | null;
          summary?: string;
          payload_json?: Json;
          provider?: string | null;
          model?: string | null;
          cost_usd?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["sales_agent_history_events"]["Insert"]
        >;
        Relationships: [];
      };
      sales_agent_bulk_jobs: {
        Row: {
          id: string;
          organization_id: string;
          job_type: string;
          status: string;
          total_count: number;
          success_count: number;
          failure_count: number;
          input_json: Json;
          result_json: Json;
          error_message: string | null;
          created_by: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          job_type: string;
          status?: string;
          total_count?: number;
          success_count?: number;
          failure_count?: number;
          input_json?: Json;
          result_json?: Json;
          error_message?: string | null;
          created_by?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["sales_agent_bulk_jobs"]["Insert"]
        >;
        Relationships: [];
      };
      marketing_agent_org_settings: {
        Row: {
          organization_id: string;
          enabled: boolean;
          approval_mode: string;
          provider: string;
          model: string;
          brand_voice: string;
          tone_of_voice: string;
          email_daily_limit: number;
          content_policies_json: Json;
          notification_rules_json: Json;
          rate_limit_per_minute: number;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          enabled?: boolean;
          approval_mode?: string;
          provider?: string;
          model?: string;
          brand_voice?: string;
          tone_of_voice?: string;
          email_daily_limit?: number;
          content_policies_json?: Json;
          notification_rules_json?: Json;
          rate_limit_per_minute?: number;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["marketing_agent_org_settings"]["Insert"]
        >;
        Relationships: [];
      };
      marketing_agent_campaigns: {
        Row: {
          id: string;
          organization_id: string;
          email_campaign_id: string | null;
          name: string;
          campaign_type: string;
          objective: string;
          status: string;
          channel: string;
          audience_summary: string;
          plan_json: Json;
          emails_json: Json;
          ctas_json: Json;
          success_criteria_json: Json;
          schedule_json: Json;
          ai_score: number;
          performance_json: Json;
          owner_user_id: string | null;
          provider: string | null;
          model: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email_campaign_id?: string | null;
          name: string;
          campaign_type?: string;
          objective?: string;
          status?: string;
          channel?: string;
          audience_summary?: string;
          plan_json?: Json;
          emails_json?: Json;
          ctas_json?: Json;
          success_criteria_json?: Json;
          schedule_json?: Json;
          ai_score?: number;
          performance_json?: Json;
          owner_user_id?: string | null;
          provider?: string | null;
          model?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["marketing_agent_campaigns"]["Insert"]
        >;
        Relationships: [];
      };
      marketing_agent_segments: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          segment_code: string;
          description: string;
          filter_json: Json;
          estimated_size: number;
          ai_score: number;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          segment_code: string;
          description?: string;
          filter_json?: Json;
          estimated_size?: number;
          ai_score?: number;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["marketing_agent_segments"]["Insert"]
        >;
        Relationships: [];
      };
      marketing_agent_content_items: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string | null;
          content_type: string;
          channel: string | null;
          title: string;
          subject: string | null;
          preview_text: string | null;
          body_text: string;
          cta_text: string | null;
          variants_json: Json;
          personalization_json: Json;
          status: string;
          ai_score: number;
          provider: string | null;
          model: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id?: string | null;
          content_type: string;
          channel?: string | null;
          title?: string;
          subject?: string | null;
          preview_text?: string | null;
          body_text?: string;
          cta_text?: string | null;
          variants_json?: Json;
          personalization_json?: Json;
          status?: string;
          ai_score?: number;
          provider?: string | null;
          model?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["marketing_agent_content_items"]["Insert"]
        >;
        Relationships: [];
      };
      marketing_agent_landing_analyses: {
        Row: {
          id: string;
          organization_id: string;
          url: string;
          title: string;
          conversion_score: number;
          readability_score: number;
          seo_score: number;
          structure_score: number;
          content_quality_score: number;
          overall_score: number;
          analysis_json: Json;
          improvements_json: Json;
          provider: string | null;
          model: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          url: string;
          title?: string;
          conversion_score?: number;
          readability_score?: number;
          seo_score?: number;
          structure_score?: number;
          content_quality_score?: number;
          overall_score?: number;
          analysis_json?: Json;
          improvements_json?: Json;
          provider?: string | null;
          model?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["marketing_agent_landing_analyses"]["Insert"]
        >;
        Relationships: [];
      };
      marketing_agent_ab_tests: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string | null;
          name: string;
          test_type: string;
          status: string;
          variants_json: Json;
          metric_primary: string;
          winner_variant_id: string | null;
          confidence: number;
          results_json: Json;
          created_by: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id?: string | null;
          name: string;
          test_type?: string;
          status?: string;
          variants_json?: Json;
          metric_primary?: string;
          winner_variant_id?: string | null;
          confidence?: number;
          results_json?: Json;
          created_by?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["marketing_agent_ab_tests"]["Insert"]
        >;
        Relationships: [];
      };
      marketing_agent_automations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          trigger_type: string;
          status: string;
          workflow_json: Json;
          nurture_rules_json: Json;
          handoff_to_sales: boolean;
          ai_score: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          trigger_type?: string;
          status?: string;
          workflow_json?: Json;
          nurture_rules_json?: Json;
          handoff_to_sales?: boolean;
          ai_score?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["marketing_agent_automations"]["Insert"]
        >;
        Relationships: [];
      };
      marketing_agent_recommendations: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string | null;
          recommendation_type: string;
          title: string;
          rationale: string;
          priority: number;
          status: string;
          payload_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id?: string | null;
          recommendation_type: string;
          title: string;
          rationale?: string;
          priority?: number;
          status?: string;
          payload_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["marketing_agent_recommendations"]["Insert"]
        >;
        Relationships: [];
      };
      marketing_agent_analytics_snapshots: {
        Row: {
          id: string;
          organization_id: string;
          period_key: string;
          open_rate: number;
          click_rate: number;
          bounce_rate: number;
          conversion_rate: number;
          roi: number;
          campaign_score: number;
          engagement_score: number;
          lead_growth: number;
          pipeline_impact: number;
          revenue_impact: number;
          metrics_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          period_key: string;
          open_rate?: number;
          click_rate?: number;
          bounce_rate?: number;
          conversion_rate?: number;
          roi?: number;
          campaign_score?: number;
          engagement_score?: number;
          lead_growth?: number;
          pipeline_impact?: number;
          revenue_impact?: number;
          metrics_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["marketing_agent_analytics_snapshots"]["Insert"]
        >;
        Relationships: [];
      };
      marketing_agent_history_events: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string | null;
          event_type: string;
          actor_user_id: string | null;
          summary: string;
          payload_json: Json;
          provider: string | null;
          model: string | null;
          cost_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id?: string | null;
          event_type: string;
          actor_user_id?: string | null;
          summary?: string;
          payload_json?: Json;
          provider?: string | null;
          model?: string | null;
          cost_usd?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["marketing_agent_history_events"]["Insert"]
        >;
        Relationships: [];
      };
      marketing_agent_bulk_jobs: {
        Row: {
          id: string;
          organization_id: string;
          job_type: string;
          status: string;
          total_count: number;
          success_count: number;
          failure_count: number;
          input_json: Json;
          result_json: Json;
          error_message: string | null;
          created_by: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          job_type: string;
          status?: string;
          total_count?: number;
          success_count?: number;
          failure_count?: number;
          input_json?: Json;
          result_json?: Json;
          error_message?: string | null;
          created_by?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["marketing_agent_bulk_jobs"]["Insert"]
        >;
        Relationships: [];
      };
      customer_success_org_settings: {
        Row: {
          organization_id: string;
          enabled: boolean;
          approval_mode: string;
          provider: string;
          model: string;
          health_weights_json: Json;
          churn_threshold: number;
          renewal_window_days: number;
          notification_rules_json: Json;
          customer_segments_json: Json;
          rate_limit_per_minute: number;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          enabled?: boolean;
          approval_mode?: string;
          provider?: string;
          model?: string;
          health_weights_json?: Json;
          churn_threshold?: number;
          renewal_window_days?: number;
          notification_rules_json?: Json;
          customer_segments_json?: Json;
          rate_limit_per_minute?: number;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_success_org_settings"]["Insert"]
        >;
        Relationships: [];
      };
      customer_success_profiles: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string;
          health_score: number;
          health_class: string;
          churn_probability: number;
          churn_reason: string | null;
          churn_confidence: number;
          nps_score: number | null;
          csat_score: number | null;
          adoption_score: number;
          engagement_score: number;
          revenue_value: number;
          contract_ends_at: string | null;
          renewal_probability: number | null;
          owner_user_id: string | null;
          signals_json: Json;
          insights_json: Json;
          upsell_json: Json;
          cross_sell_json: Json;
          feature_adoption_json: Json;
          timeline_json: Json;
          ai_confidence: number;
          provider: string | null;
          model: string | null;
          analyzed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id: string;
          health_score?: number;
          health_class?: string;
          churn_probability?: number;
          churn_reason?: string | null;
          churn_confidence?: number;
          nps_score?: number | null;
          csat_score?: number | null;
          adoption_score?: number;
          engagement_score?: number;
          revenue_value?: number;
          contract_ends_at?: string | null;
          renewal_probability?: number | null;
          owner_user_id?: string | null;
          signals_json?: Json;
          insights_json?: Json;
          upsell_json?: Json;
          cross_sell_json?: Json;
          feature_adoption_json?: Json;
          timeline_json?: Json;
          ai_confidence?: number;
          provider?: string | null;
          model?: string | null;
          analyzed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_success_profiles"]["Insert"]
        >;
        Relationships: [];
      };
      customer_success_plans: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string;
          profile_id: string | null;
          name: string;
          status: string;
          milestones_json: Json;
          progress_percent: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id: string;
          profile_id?: string | null;
          name: string;
          status?: string;
          milestones_json?: Json;
          progress_percent?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_success_plans"]["Insert"]
        >;
        Relationships: [];
      };
      customer_success_renewals: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string;
          profile_id: string | null;
          contract_ends_at: string;
          renewal_probability: number;
          risk_level: string;
          status: string;
          recommendations_json: Json;
          tasks_json: Json;
          owner_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id: string;
          profile_id?: string | null;
          contract_ends_at: string;
          renewal_probability?: number;
          risk_level?: string;
          status?: string;
          recommendations_json?: Json;
          tasks_json?: Json;
          owner_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_success_renewals"]["Insert"]
        >;
        Relationships: [];
      };
      customer_success_onboarding: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string;
          profile_id: string | null;
          status: string;
          checklist_json: Json;
          progress_percent: number;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id: string;
          profile_id?: string | null;
          status?: string;
          checklist_json?: Json;
          progress_percent?: number;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_success_onboarding"]["Insert"]
        >;
        Relationships: [];
      };
      customer_success_recommendations: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string | null;
          recommendation_type: string;
          title: string;
          rationale: string;
          priority: number;
          status: string;
          payload_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id?: string | null;
          recommendation_type: string;
          title: string;
          rationale?: string;
          priority?: number;
          status?: string;
          payload_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_success_recommendations"]["Insert"]
        >;
        Relationships: [];
      };
      customer_success_alerts: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string | null;
          alert_type: string;
          severity: string;
          title: string;
          message: string;
          status: string;
          payload_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id?: string | null;
          alert_type: string;
          severity?: string;
          title: string;
          message?: string;
          status?: string;
          payload_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_success_alerts"]["Insert"]
        >;
        Relationships: [];
      };
      customer_success_history_events: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string | null;
          event_type: string;
          actor_user_id: string | null;
          summary: string;
          payload_json: Json;
          provider: string | null;
          model: string | null;
          cost_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id?: string | null;
          event_type: string;
          actor_user_id?: string | null;
          summary?: string;
          payload_json?: Json;
          provider?: string | null;
          model?: string | null;
          cost_usd?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_success_history_events"]["Insert"]
        >;
        Relationships: [];
      };
      customer_success_bulk_jobs: {
        Row: {
          id: string;
          organization_id: string;
          job_type: string;
          status: string;
          total_count: number;
          success_count: number;
          failure_count: number;
          input_json: Json;
          result_json: Json;
          error_message: string | null;
          created_by: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          job_type: string;
          status?: string;
          total_count?: number;
          success_count?: number;
          failure_count?: number;
          input_json?: Json;
          result_json?: Json;
          error_message?: string | null;
          created_by?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_success_bulk_jobs"]["Insert"]
        >;
        Relationships: [];
      };
      revenue_intel_org_settings: {
        Row: {
          organization_id: string;
          enabled: boolean;
          approval_mode: string;
          provider: string;
          model: string;
          forecast_horizon_months: number;
          kpi_config_json: Json;
          notification_rules_json: Json;
          report_schedule_json: Json;
          rate_limit_per_minute: number;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          enabled?: boolean;
          approval_mode?: string;
          provider?: string;
          model?: string;
          forecast_horizon_months?: number;
          kpi_config_json?: Json;
          notification_rules_json?: Json;
          report_schedule_json?: Json;
          rate_limit_per_minute?: number;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["revenue_intel_org_settings"]["Insert"]
        >;
        Relationships: [];
      };
      revenue_intel_snapshots: {
        Row: {
          id: string;
          organization_id: string;
          period_key: string;
          period_type: string;
          mrr: number;
          arr: number;
          acv: number;
          arpa: number;
          ltv: number;
          cac: number;
          ltv_cac: number;
          gross_revenue: number;
          net_revenue: number;
          expansion_revenue: number;
          contraction_revenue: number;
          retention_rate: number;
          nrr: number;
          grr: number;
          margin_rate: number;
          profit: number;
          avg_deal_value: number;
          avg_order_value: number;
          growth_rate: number;
          customer_count: number;
          metrics_json: Json;
          filters_json: Json;
          ai_confidence: number;
          provider: string | null;
          model: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          period_key: string;
          period_type?: string;
          mrr?: number;
          arr?: number;
          acv?: number;
          arpa?: number;
          ltv?: number;
          cac?: number;
          ltv_cac?: number;
          gross_revenue?: number;
          net_revenue?: number;
          expansion_revenue?: number;
          contraction_revenue?: number;
          retention_rate?: number;
          nrr?: number;
          grr?: number;
          margin_rate?: number;
          profit?: number;
          avg_deal_value?: number;
          avg_order_value?: number;
          growth_rate?: number;
          customer_count?: number;
          metrics_json?: Json;
          filters_json?: Json;
          ai_confidence?: number;
          provider?: string | null;
          model?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["revenue_intel_snapshots"]["Insert"]
        >;
        Relationships: [];
      };
      revenue_intel_forecasts: {
        Row: {
          id: string;
          organization_id: string;
          horizon: string;
          forecast_revenue: number;
          pipeline_open: number;
          pipeline_weighted: number;
          likely_revenue: number;
          risk_revenue: number;
          missed_revenue: number;
          expected_closings: number;
          confidence: number;
          breakdown_json: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          horizon: string;
          forecast_revenue?: number;
          pipeline_open?: number;
          pipeline_weighted?: number;
          likely_revenue?: number;
          risk_revenue?: number;
          missed_revenue?: number;
          expected_closings?: number;
          confidence?: number;
          breakdown_json?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["revenue_intel_forecasts"]["Insert"]
        >;
        Relationships: [];
      };
      revenue_intel_scenarios: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          scenario_type: string;
          assumptions_json: Json;
          impact_json: Json;
          delta_mrr: number;
          delta_arr: number;
          delta_profit: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          scenario_type: string;
          assumptions_json?: Json;
          impact_json?: Json;
          delta_mrr?: number;
          delta_arr?: number;
          delta_profit?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["revenue_intel_scenarios"]["Insert"]
        >;
        Relationships: [];
      };
      revenue_intel_insights: {
        Row: {
          id: string;
          organization_id: string;
          insight_type: string;
          title: string;
          body: string;
          severity: string;
          priority: number;
          payload_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          insight_type: string;
          title: string;
          body?: string;
          severity?: string;
          priority?: number;
          payload_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["revenue_intel_insights"]["Insert"]
        >;
        Relationships: [];
      };
      revenue_intel_recommendations: {
        Row: {
          id: string;
          organization_id: string;
          recommendation_type: string;
          title: string;
          rationale: string;
          priority: number;
          status: string;
          payload_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          recommendation_type: string;
          title: string;
          rationale?: string;
          priority?: number;
          status?: string;
          payload_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["revenue_intel_recommendations"]["Insert"]
        >;
        Relationships: [];
      };
      revenue_intel_alerts: {
        Row: {
          id: string;
          organization_id: string;
          alert_type: string;
          severity: string;
          title: string;
          message: string;
          status: string;
          payload_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          alert_type: string;
          severity?: string;
          title: string;
          message?: string;
          status?: string;
          payload_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["revenue_intel_alerts"]["Insert"]
        >;
        Relationships: [];
      };
      revenue_intel_reports: {
        Row: {
          id: string;
          organization_id: string;
          report_type: string;
          title: string;
          format: string;
          body_markdown: string;
          sections_json: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          report_type: string;
          title: string;
          format?: string;
          body_markdown?: string;
          sections_json?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["revenue_intel_reports"]["Insert"]
        >;
        Relationships: [];
      };
      revenue_intel_history_events: {
        Row: {
          id: string;
          organization_id: string;
          event_type: string;
          actor_user_id: string | null;
          summary: string;
          payload_json: Json;
          provider: string | null;
          model: string | null;
          cost_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_type: string;
          actor_user_id?: string | null;
          summary?: string;
          payload_json?: Json;
          provider?: string | null;
          model?: string | null;
          cost_usd?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["revenue_intel_history_events"]["Insert"]
        >;
        Relationships: [];
      };
      revenue_intel_bulk_jobs: {
        Row: {
          id: string;
          organization_id: string;
          job_type: string;
          status: string;
          total_count: number;
          success_count: number;
          failure_count: number;
          input_json: Json;
          result_json: Json;
          error_message: string | null;
          created_by: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          job_type: string;
          status?: string;
          total_count?: number;
          success_count?: number;
          failure_count?: number;
          input_json?: Json;
          result_json?: Json;
          error_message?: string | null;
          created_by?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["revenue_intel_bulk_jobs"]["Insert"]
        >;
        Relationships: [];
      };
      orchestrator_org_settings: {
        Row: {
          organization_id: string;
          enabled: boolean;
          approval_policy: string;
          autonomy_level: string;
          provider: string;
          model: string;
          provider_priority_json: Json;
          default_agents_json: Json;
          model_router_json: Json;
          workflow_timeout_seconds: number;
          retry_limit: number;
          cost_limit_usd: number;
          memory_policy_json: Json;
          notification_rules_json: Json;
          rate_limit_per_minute: number;
          metadata_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          enabled?: boolean;
          approval_policy?: string;
          autonomy_level?: string;
          provider?: string;
          model?: string;
          provider_priority_json?: Json;
          default_agents_json?: Json;
          model_router_json?: Json;
          workflow_timeout_seconds?: number;
          retry_limit?: number;
          cost_limit_usd?: number;
          memory_policy_json?: Json;
          notification_rules_json?: Json;
          rate_limit_per_minute?: number;
          metadata_json?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["orchestrator_org_settings"]["Insert"]
        >;
        Relationships: [];
      };
      orchestrator_goals: {
        Row: {
          id: string;
          organization_id: string;
          goal_text: string;
          intent: string;
          status: string;
          priority: number;
          filters_json: Json;
          context_json: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          goal_text: string;
          intent?: string;
          status?: string;
          priority?: number;
          filters_json?: Json;
          context_json?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["orchestrator_goals"]["Insert"]
        >;
        Relationships: [];
      };
      orchestrator_plans: {
        Row: {
          id: string;
          organization_id: string;
          goal_id: string;
          version: number;
          status: string;
          steps_json: Json;
          parallel_groups_json: Json;
          dependencies_json: Json;
          estimated_cost_usd: number;
          estimated_duration_ms: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          goal_id: string;
          version?: number;
          status?: string;
          steps_json?: Json;
          parallel_groups_json?: Json;
          dependencies_json?: Json;
          estimated_cost_usd?: number;
          estimated_duration_ms?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["orchestrator_plans"]["Insert"]
        >;
        Relationships: [];
      };
      orchestrator_executions: {
        Row: {
          id: string;
          organization_id: string;
          goal_id: string;
          plan_id: string;
          status: string;
          progress_pct: number;
          agents_json: Json;
          result_json: Json;
          merged_report: string;
          executive_summary: string;
          cost_usd: number;
          tokens_used: number;
          provider: string | null;
          model: string | null;
          latency_ms: number;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          goal_id: string;
          plan_id: string;
          status?: string;
          progress_pct?: number;
          agents_json?: Json;
          result_json?: Json;
          merged_report?: string;
          executive_summary?: string;
          cost_usd?: number;
          tokens_used?: number;
          provider?: string | null;
          model?: string | null;
          latency_ms?: number;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["orchestrator_executions"]["Insert"]
        >;
        Relationships: [];
      };
      orchestrator_tasks: {
        Row: {
          id: string;
          organization_id: string;
          execution_id: string;
          plan_id: string;
          step_key: string;
          agent_slug: string;
          title: string;
          status: string;
          priority: number;
          depends_on_json: Json;
          parallel_group: number | null;
          attempt: number;
          max_attempts: number;
          timeout_seconds: number;
          input_json: Json;
          output_json: Json;
          error_message: string | null;
          provider: string | null;
          model: string | null;
          cost_usd: number;
          latency_ms: number;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          execution_id: string;
          plan_id: string;
          step_key: string;
          agent_slug: string;
          title: string;
          status?: string;
          priority?: number;
          depends_on_json?: Json;
          parallel_group?: number | null;
          attempt?: number;
          max_attempts?: number;
          timeout_seconds?: number;
          input_json?: Json;
          output_json?: Json;
          error_message?: string | null;
          provider?: string | null;
          model?: string | null;
          cost_usd?: number;
          latency_ms?: number;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["orchestrator_tasks"]["Insert"]
        >;
        Relationships: [];
      };
      orchestrator_approvals: {
        Row: {
          id: string;
          organization_id: string;
          execution_id: string;
          task_id: string | null;
          approval_type: string;
          status: string;
          title: string;
          rationale: string;
          required_roles_json: Json;
          decided_by: string | null;
          decided_at: string | null;
          payload_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          execution_id: string;
          task_id?: string | null;
          approval_type?: string;
          status?: string;
          title: string;
          rationale?: string;
          required_roles_json?: Json;
          decided_by?: string | null;
          decided_at?: string | null;
          payload_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["orchestrator_approvals"]["Insert"]
        >;
        Relationships: [];
      };
      orchestrator_agent_messages: {
        Row: {
          id: string;
          organization_id: string;
          execution_id: string;
          from_agent_slug: string;
          to_agent_slug: string | null;
          message_type: string;
          body: string;
          payload_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          execution_id: string;
          from_agent_slug: string;
          to_agent_slug?: string | null;
          message_type?: string;
          body?: string;
          payload_json?: Json;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["orchestrator_agent_messages"]["Insert"]
        >;
        Relationships: [];
      };
      orchestrator_history_events: {
        Row: {
          id: string;
          organization_id: string;
          execution_id: string | null;
          goal_id: string | null;
          event_type: string;
          actor_user_id: string | null;
          summary: string;
          payload_json: Json;
          provider: string | null;
          model: string | null;
          cost_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          execution_id?: string | null;
          goal_id?: string | null;
          event_type: string;
          actor_user_id?: string | null;
          summary?: string;
          payload_json?: Json;
          provider?: string | null;
          model?: string | null;
          cost_usd?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["orchestrator_history_events"]["Insert"]
        >;
        Relationships: [];
      };
      orchestrator_bulk_jobs: {
        Row: {
          id: string;
          organization_id: string;
          job_type: string;
          status: string;
          total_count: number;
          success_count: number;
          failure_count: number;
          input_json: Json;
          result_json: Json;
          error_message: string | null;
          created_by: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          job_type: string;
          status?: string;
          total_count?: number;
          success_count?: number;
          failure_count?: number;
          input_json?: Json;
          result_json?: Json;
          error_message?: string | null;
          created_by?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["orchestrator_bulk_jobs"]["Insert"]
        >;
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
      get_public_white_label_by_hostname: {
        Args: { p_hostname: string };
        Returns: Json;
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
