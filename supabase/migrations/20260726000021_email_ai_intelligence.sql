-- Lead Engine — Email AI Intelligence (Phase 21K)
-- Additive only. Run manually AFTER 20260726000020_email_analytics_intelligence.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00020.
-- AI assists users; never autonomously sends or activates campaigns/sequences.
-- Idempotent: safe to re-run after partial execution (DROP IF EXISTS before recreate).

-- ---------------------------------------------------------------------------
-- Organization AI settings (feature flags + cost/rate controls)
-- ---------------------------------------------------------------------------

create table if not exists public.email_ai_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ai_enabled boolean not null default false,
  writing_enabled boolean not null default false,
  reply_classification_enabled boolean not null default false,
  reply_drafting_enabled boolean not null default false,
  analytics_insights_enabled boolean not null default false,
  translation_enabled boolean not null default false,
  personalization_enabled boolean not null default false,
  context_enrichment_enabled boolean not null default false,
  automatic_actions_enabled boolean not null default false,
  preferred_provider text not null default 'openai'
    check (preferred_provider in ('openai', 'anthropic', 'google', 'azure_openai', 'self_hosted', 'none')),
  preferred_model text,
  fallback_allowed boolean not null default false,
  fallback_provider text,
  fallback_model text,
  allowed_models_json jsonb not null default '[]'::jsonb,
  allow_expensive_models boolean not null default false,
  monthly_budget numeric(12,4),
  daily_budget numeric(12,4),
  per_user_daily_limit numeric(12,4),
  per_generation_token_limit integer,
  maximum_variants integer not null default 3,
  warning_threshold_pct numeric(5,2) not null default 80,
  hard_limit_enabled boolean not null default true,
  use_minimal_context boolean not null default true,
  use_selected_crm_fields boolean not null default true,
  use_campaign_history boolean not null default false,
  use_reply_content boolean not null default false,
  use_analytics boolean not null default true,
  use_organization_notes boolean not null default false,
  allow_provider_retention boolean not null default false,
  allow_provider_training boolean not null default false,
  store_generated_content boolean not null default true,
  store_raw_provider_response boolean not null default false,
  organization_instructions text,
  retention_days integer not null default 365,
  active_brand_voice_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id)
);

drop trigger if exists email_ai_settings_set_updated_at on public.email_ai_settings;
create trigger email_ai_settings_set_updated_at
before update on public.email_ai_settings
for each row execute function public.set_updated_at();

alter table public.email_ai_settings enable row level security;

drop policy if exists "email_ai_settings_select" on public.email_ai_settings;
create policy "email_ai_settings_select"
  on public.email_ai_settings for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_ai_settings_insert" on public.email_ai_settings;
create policy "email_ai_settings_insert"
  on public.email_ai_settings for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "email_ai_settings_update" on public.email_ai_settings;
create policy "email_ai_settings_update"
  on public.email_ai_settings for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Brand voices
-- ---------------------------------------------------------------------------

create table if not exists public.email_ai_brand_voices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  voice_name text not null,
  description text,
  tone_attributes_json jsonb not null default '[]'::jsonb,
  preferred_terms_json jsonb not null default '[]'::jsonb,
  avoided_terms_json jsonb not null default '[]'::jsonb,
  preferred_greeting text,
  preferred_sign_off text,
  sentence_style text,
  formality text not null default 'professional'
    check (formality in ('formal', 'professional', 'friendly', 'informal', 'neutral')),
  humor_level text not null default 'none'
    check (humor_level in ('none', 'light', 'moderate')),
  emoji_policy text not null default 'none'
    check (emoji_policy in ('none', 'sparing', 'allowed')),
  claim_policy text not null default 'conservative',
  cta_style text,
  example_content text,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_ai_brand_voices_org_idx
  on public.email_ai_brand_voices (organization_id, is_active, updated_at desc);

drop trigger if exists email_ai_brand_voices_set_updated_at on public.email_ai_brand_voices;
create trigger email_ai_brand_voices_set_updated_at
before update on public.email_ai_brand_voices
for each row execute function public.set_updated_at();

alter table public.email_ai_brand_voices enable row level security;

drop policy if exists "email_ai_brand_voices_select" on public.email_ai_brand_voices;
create policy "email_ai_brand_voices_select"
  on public.email_ai_brand_voices for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_ai_brand_voices_insert" on public.email_ai_brand_voices;
create policy "email_ai_brand_voices_insert"
  on public.email_ai_brand_voices for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "email_ai_brand_voices_update" on public.email_ai_brand_voices;
create policy "email_ai_brand_voices_update"
  on public.email_ai_brand_voices for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

drop policy if exists "email_ai_brand_voices_delete" on public.email_ai_brand_voices;
create policy "email_ai_brand_voices_delete"
  on public.email_ai_brand_voices for delete
  to authenticated using (public.is_org_owner_or_admin(organization_id));

alter table public.email_ai_settings
  drop constraint if exists email_ai_settings_brand_voice_fk;

alter table public.email_ai_settings
  add constraint email_ai_settings_brand_voice_fk
  foreign key (active_brand_voice_id)
  references public.email_ai_brand_voices (id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- Prompt templates + versions (system defaults + org overrides)
-- ---------------------------------------------------------------------------

create table if not exists public.email_ai_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  prompt_code text not null,
  name text not null,
  purpose text not null,
  is_system_default boolean not null default false,
  active_version integer not null default 1,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists email_ai_prompt_templates_org_code_idx
  on public.email_ai_prompt_templates (coalesce(organization_id::text, 'system'), prompt_code)
  where archived_at is null;

drop trigger if exists email_ai_prompt_templates_set_updated_at on public.email_ai_prompt_templates;
create trigger email_ai_prompt_templates_set_updated_at
before update on public.email_ai_prompt_templates
for each row execute function public.set_updated_at();

alter table public.email_ai_prompt_templates enable row level security;

drop policy if exists "email_ai_prompt_templates_select" on public.email_ai_prompt_templates;
create policy "email_ai_prompt_templates_select"
  on public.email_ai_prompt_templates for select
  to authenticated using (
    organization_id is null
    or public.is_org_member(organization_id)
  );

drop policy if exists "email_ai_prompt_templates_manage" on public.email_ai_prompt_templates;
create policy "email_ai_prompt_templates_manage"
  on public.email_ai_prompt_templates for all
  to authenticated using (
    organization_id is not null
    and public.is_org_owner_or_admin(organization_id)
  )
  with check (
    organization_id is not null
    and public.is_org_owner_or_admin(organization_id)
  );

create table if not exists public.email_ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_template_id uuid not null references public.email_ai_prompt_templates (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  version integer not null,
  system_instructions text not null,
  user_template text not null,
  input_schema_json jsonb not null default '{}'::jsonb,
  output_schema_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (prompt_template_id, version)
);

create index if not exists email_ai_prompt_versions_template_idx
  on public.email_ai_prompt_versions (prompt_template_id, version desc);

drop trigger if exists email_ai_prompt_versions_set_updated_at on public.email_ai_prompt_versions;
create trigger email_ai_prompt_versions_set_updated_at
before update on public.email_ai_prompt_versions
for each row execute function public.set_updated_at();

alter table public.email_ai_prompt_versions enable row level security;

drop policy if exists "email_ai_prompt_versions_select" on public.email_ai_prompt_versions;
create policy "email_ai_prompt_versions_select"
  on public.email_ai_prompt_versions for select
  to authenticated using (
    organization_id is null
    or public.is_org_member(organization_id)
  );

-- ---------------------------------------------------------------------------
-- Generations (audit trail) + variants
-- ---------------------------------------------------------------------------

create table if not exists public.email_ai_generations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  requested_by uuid not null,
  generation_type text not null
    check (generation_type in (
      'subject_line', 'preview_text', 'email_body', 'email_rewrite',
      'follow_up_email', 'sequence_draft', 'reply_draft', 'reply_classification',
      'campaign_summary', 'recipient_summary', 'next_best_action',
      'performance_insight', 'template_improvement', 'tone_change',
      'translation', 'personalization_suggestion', 'objection_response',
      'meeting_follow_up', 'breakup_email'
    )),
  feature text not null default 'writing',
  status text not null default 'generated'
    check (status in (
      'generated', 'needs_review', 'approved', 'rejected',
      'applied_to_draft', 'archived', 'failed'
    )),
  approval_state text not null default 'needs_review'
    check (approval_state in (
      'generated', 'needs_review', 'approved', 'rejected',
      'applied_to_draft', 'archived'
    )),
  provider_code text not null default 'openai',
  model text,
  prompt_template_code text,
  prompt_version integer,
  source_template_id uuid,
  source_sequence_id uuid,
  source_campaign_id uuid,
  source_reply_event_id uuid,
  parent_generation_id uuid references public.email_ai_generations (id) on delete set null,
  request_fingerprint text,
  idempotency_key text,
  context_manifest_json jsonb not null default '{}'::jsonb,
  input_summary_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  validation_json jsonb not null default '{}'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  safety_json jsonb not null default '{}'::jsonb,
  confidence text
    check (confidence is null or confidence in ('low', 'medium', 'high', 'not_enough_data')),
  error_code text,
  error_message text,
  duration_ms integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists email_ai_generations_idempotency_idx
  on public.email_ai_generations (organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists email_ai_generations_org_created_idx
  on public.email_ai_generations (organization_id, created_at desc);

create index if not exists email_ai_generations_type_idx
  on public.email_ai_generations (organization_id, generation_type, created_at desc);

create index if not exists email_ai_generations_user_idx
  on public.email_ai_generations (organization_id, requested_by, created_at desc);

create index if not exists email_ai_generations_campaign_idx
  on public.email_ai_generations (organization_id, source_campaign_id)
  where source_campaign_id is not null;

create index if not exists email_ai_generations_template_idx
  on public.email_ai_generations (organization_id, source_template_id)
  where source_template_id is not null;

create index if not exists email_ai_generations_sequence_idx
  on public.email_ai_generations (organization_id, source_sequence_id)
  where source_sequence_id is not null;

drop trigger if exists email_ai_generations_set_updated_at on public.email_ai_generations;
create trigger email_ai_generations_set_updated_at
before update on public.email_ai_generations
for each row execute function public.set_updated_at();

alter table public.email_ai_generations enable row level security;

drop policy if exists "email_ai_generations_select" on public.email_ai_generations;
create policy "email_ai_generations_select"
  on public.email_ai_generations for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_ai_generations_insert" on public.email_ai_generations;
create policy "email_ai_generations_insert"
  on public.email_ai_generations for insert
  to authenticated with check (public.is_org_member(organization_id));

drop policy if exists "email_ai_generations_update" on public.email_ai_generations;
create policy "email_ai_generations_update"
  on public.email_ai_generations for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.email_ai_generation_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  generation_id uuid not null references public.email_ai_generations (id) on delete cascade,
  variant_index integer not null default 0,
  label text,
  content_json jsonb not null default '{}'::jsonb,
  subject text,
  preview_text text,
  html_body text,
  plain_text text,
  cta text,
  personalization_vars_json jsonb not null default '[]'::jsonb,
  assumptions_json jsonb not null default '[]'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  is_selected boolean not null default false,
  is_rejected boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (generation_id, variant_index)
);

create index if not exists email_ai_generation_variants_gen_idx
  on public.email_ai_generation_variants (generation_id, variant_index);

drop trigger if exists email_ai_generation_variants_set_updated_at on public.email_ai_generation_variants;
create trigger email_ai_generation_variants_set_updated_at
before update on public.email_ai_generation_variants
for each row execute function public.set_updated_at();

alter table public.email_ai_generation_variants enable row level security;

drop policy if exists "email_ai_generation_variants_select" on public.email_ai_generation_variants;
create policy "email_ai_generation_variants_select"
  on public.email_ai_generation_variants for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_ai_generation_variants_insert" on public.email_ai_generation_variants;
create policy "email_ai_generation_variants_insert"
  on public.email_ai_generation_variants for insert
  to authenticated with check (public.is_org_member(organization_id));

drop policy if exists "email_ai_generation_variants_update" on public.email_ai_generation_variants;
create policy "email_ai_generation_variants_update"
  on public.email_ai_generation_variants for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Usage / cost tracking
-- ---------------------------------------------------------------------------

create table if not exists public.email_ai_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid,
  generation_id uuid references public.email_ai_generations (id) on delete set null,
  feature text not null,
  generation_type text not null,
  provider_code text not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost numeric(12,6) not null default 0,
  duration_ms integer,
  status text not null default 'completed'
    check (status in ('completed', 'failed', 'blocked', 'rate_limited', 'budget_exceeded')),
  error_code text,
  campaign_id uuid,
  sequence_id uuid,
  template_id uuid,
  reply_event_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_ai_usage_org_created_idx
  on public.email_ai_usage (organization_id, created_at desc);

create index if not exists email_ai_usage_user_idx
  on public.email_ai_usage (organization_id, user_id, created_at desc);

create index if not exists email_ai_usage_feature_idx
  on public.email_ai_usage (organization_id, feature, created_at desc);

alter table public.email_ai_usage enable row level security;

drop policy if exists "email_ai_usage_select" on public.email_ai_usage;
create policy "email_ai_usage_select"
  on public.email_ai_usage for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_ai_usage_insert" on public.email_ai_usage;
create policy "email_ai_usage_insert"
  on public.email_ai_usage for insert
  to authenticated with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Feedback
-- ---------------------------------------------------------------------------

create table if not exists public.email_ai_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  generation_id uuid not null references public.email_ai_generations (id) on delete cascade,
  variant_id uuid references public.email_ai_generation_variants (id) on delete set null,
  user_id uuid not null,
  feedback_code text not null
    check (feedback_code in (
      'useful', 'not_useful', 'too_long', 'too_short', 'wrong_tone',
      'incorrect', 'unsafe', 'too_generic', 'good_personalization',
      'bad_personalization', 'other'
    )),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_ai_feedback_gen_idx
  on public.email_ai_feedback (organization_id, generation_id, created_at desc);

alter table public.email_ai_feedback enable row level security;

drop policy if exists "email_ai_feedback_select" on public.email_ai_feedback;
create policy "email_ai_feedback_select"
  on public.email_ai_feedback for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_ai_feedback_insert" on public.email_ai_feedback;
create policy "email_ai_feedback_insert"
  on public.email_ai_feedback for insert
  to authenticated with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Reply classifications (preserve deterministic + AI layers)
-- ---------------------------------------------------------------------------

create table if not exists public.email_ai_reply_classifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  tracking_event_id uuid,
  queue_item_id uuid,
  campaign_execution_id uuid,
  enrollment_id uuid,
  deterministic_classification text,
  ai_classification text,
  ai_confidence text
    check (ai_confidence is null or ai_confidence in ('low', 'medium', 'high', 'not_enough_data')),
  ai_explanation text,
  evidence_snippets_json jsonb not null default '[]'::jsonb,
  final_classification text,
  final_classification_source text not null default 'deterministic'
    check (final_classification_source in ('deterministic', 'ai', 'human')),
  human_override text,
  human_override_by uuid,
  human_override_at timestamptz,
  generation_id uuid references public.email_ai_generations (id) on delete set null,
  requires_manual_review boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_ai_reply_classifications_org_idx
  on public.email_ai_reply_classifications (organization_id, created_at desc);

create index if not exists email_ai_reply_classifications_event_idx
  on public.email_ai_reply_classifications (organization_id, tracking_event_id)
  where tracking_event_id is not null;

drop trigger if exists email_ai_reply_classifications_set_updated_at on public.email_ai_reply_classifications;
create trigger email_ai_reply_classifications_set_updated_at
before update on public.email_ai_reply_classifications
for each row execute function public.set_updated_at();

alter table public.email_ai_reply_classifications enable row level security;

drop policy if exists "email_ai_reply_classifications_select" on public.email_ai_reply_classifications;
create policy "email_ai_reply_classifications_select"
  on public.email_ai_reply_classifications for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_ai_reply_classifications_insert" on public.email_ai_reply_classifications;
create policy "email_ai_reply_classifications_insert"
  on public.email_ai_reply_classifications for insert
  to authenticated with check (public.is_org_member(organization_id));

drop policy if exists "email_ai_reply_classifications_update" on public.email_ai_reply_classifications;
create policy "email_ai_reply_classifications_update"
  on public.email_ai_reply_classifications for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Next-action suggestions (never auto-executed)
-- ---------------------------------------------------------------------------

create table if not exists public.email_ai_next_action_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  generation_id uuid references public.email_ai_generations (id) on delete set null,
  classification_id uuid references public.email_ai_reply_classifications (id) on delete set null,
  action_code text not null
    check (action_code in (
      'reply_manually', 'send_meeting_link', 'create_follow_up_task',
      'assign_account_owner', 'pause_sequence', 'stop_sequence',
      'update_lead_status', 'move_opportunity', 'request_more_information',
      'mark_not_interested', 'suppress_recipient', 'review_complaint',
      'wait', 'no_action'
    )),
  reason text not null,
  supporting_evidence_json jsonb not null default '[]'::jsonb,
  confidence text not null default 'medium'
    check (confidence in ('low', 'medium', 'high', 'not_enough_data')),
  required_permission text,
  human_approval_required boolean not null default true,
  status text not null default 'suggested'
    check (status in ('suggested', 'accepted', 'rejected', 'executed_manually', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_ai_next_action_suggestions_org_idx
  on public.email_ai_next_action_suggestions (organization_id, status, created_at desc);

drop trigger if exists email_ai_next_action_suggestions_set_updated_at on public.email_ai_next_action_suggestions;
create trigger email_ai_next_action_suggestions_set_updated_at
before update on public.email_ai_next_action_suggestions
for each row execute function public.set_updated_at();

alter table public.email_ai_next_action_suggestions enable row level security;

drop policy if exists "email_ai_next_action_suggestions_select" on public.email_ai_next_action_suggestions;
create policy "email_ai_next_action_suggestions_select"
  on public.email_ai_next_action_suggestions for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_ai_next_action_suggestions_insert" on public.email_ai_next_action_suggestions;
create policy "email_ai_next_action_suggestions_insert"
  on public.email_ai_next_action_suggestions for insert
  to authenticated with check (public.is_org_member(organization_id));

drop policy if exists "email_ai_next_action_suggestions_update" on public.email_ai_next_action_suggestions;
create policy "email_ai_next_action_suggestions_update"
  on public.email_ai_next_action_suggestions for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- AI insights (separate from rule-based analytics insights)
-- ---------------------------------------------------------------------------

create table if not exists public.email_ai_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  generation_id uuid references public.email_ai_generations (id) on delete set null,
  insight_code text not null,
  title text not null,
  explanation text not null,
  severity text not null default 'informational'
    check (severity in ('informational', 'positive', 'warning', 'high_priority', 'critical')),
  confidence text not null default 'medium'
    check (confidence in ('low', 'medium', 'high', 'not_enough_data')),
  supporting_metrics_json jsonb not null default '{}'::jsonb,
  data_quality_json jsonb not null default '[]'::jsonb,
  campaign_id uuid,
  sequence_id uuid,
  sender_profile_id uuid,
  date_range_json jsonb not null default '{}'::jsonb,
  review_status text not null default 'open'
    check (review_status in ('open', 'reviewed', 'dismissed')),
  generated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_ai_insights_org_status_idx
  on public.email_ai_insights (organization_id, review_status, severity, generated_at desc);

drop trigger if exists email_ai_insights_set_updated_at on public.email_ai_insights;
create trigger email_ai_insights_set_updated_at
before update on public.email_ai_insights
for each row execute function public.set_updated_at();

alter table public.email_ai_insights enable row level security;

drop policy if exists "email_ai_insights_select" on public.email_ai_insights;
create policy "email_ai_insights_select"
  on public.email_ai_insights for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_ai_insights_insert" on public.email_ai_insights;
create policy "email_ai_insights_insert"
  on public.email_ai_insights for insert
  to authenticated with check (public.is_org_member(organization_id));

drop policy if exists "email_ai_insights_update" on public.email_ai_insights;
create policy "email_ai_insights_update"
  on public.email_ai_insights for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Context manifests (categories, not always full values)
-- ---------------------------------------------------------------------------

create table if not exists public.email_ai_context_manifests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  generation_id uuid references public.email_ai_generations (id) on delete set null,
  sources_json jsonb not null default '[]'::jsonb,
  allowed_fields_json jsonb not null default '[]'::jsonb,
  redacted_fields_json jsonb not null default '[]'::jsonb,
  truncated boolean not null default false,
  truncation_notes text,
  estimated_tokens integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_ai_context_manifests_gen_idx
  on public.email_ai_context_manifests (organization_id, generation_id);

alter table public.email_ai_context_manifests enable row level security;

drop policy if exists "email_ai_context_manifests_select" on public.email_ai_context_manifests;
create policy "email_ai_context_manifests_select"
  on public.email_ai_context_manifests for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_ai_context_manifests_insert" on public.email_ai_context_manifests;
create policy "email_ai_context_manifests_insert"
  on public.email_ai_context_manifests for insert
  to authenticated with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Approval events
-- ---------------------------------------------------------------------------

create table if not exists public.email_ai_approval_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  generation_id uuid not null references public.email_ai_generations (id) on delete cascade,
  variant_id uuid references public.email_ai_generation_variants (id) on delete set null,
  actor_user_id uuid not null,
  event_type text not null
    check (event_type in (
      'approved', 'rejected', 'applied_to_draft', 'archived',
      'override_classification', 'marked_unsafe', 'edited'
    )),
  notes text,
  previous_state text,
  new_state text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_ai_approval_events_gen_idx
  on public.email_ai_approval_events (organization_id, generation_id, created_at desc);

alter table public.email_ai_approval_events enable row level security;

drop policy if exists "email_ai_approval_events_select" on public.email_ai_approval_events;
create policy "email_ai_approval_events_select"
  on public.email_ai_approval_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "email_ai_approval_events_insert" on public.email_ai_approval_events;
create policy "email_ai_approval_events_insert"
  on public.email_ai_approval_events for insert
  to authenticated with check (public.is_org_member(organization_id));

comment on table public.email_ai_settings is
  'Phase 21K org AI feature flags. automatic_actions_enabled defaults false and must stay off for autonomous send.';
comment on table public.email_ai_generations is
  'Phase 21K AI generation audit. Outputs require human review before applying to drafts.';
