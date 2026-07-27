-- Lead Engine — Email Analytics Intelligence (Phase 21J)
-- Additive only. Run manually AFTER 20260726000019_email_preferences_and_suppression.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00019.

-- ---------------------------------------------------------------------------
-- Organization cost settings (ROI foundation)
-- ---------------------------------------------------------------------------

create table if not exists public.email_cost_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  currency text not null default 'EUR',
  provider_cost_per_thousand numeric(12,4),
  fixed_monthly_provider_cost numeric(12,4),
  enrichment_cost_per_lead numeric(12,4),
  ai_cost_per_generation numeric(12,4),
  internal_labor_cost_per_hour numeric(12,4),
  campaign_fixed_cost_default numeric(12,4),
  custom_cost_json jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id)
);

create trigger email_cost_settings_set_updated_at
before update on public.email_cost_settings
for each row execute function public.set_updated_at();

alter table public.email_cost_settings enable row level security;

create policy "email_cost_settings_select"
  on public.email_cost_settings for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_cost_settings_insert"
  on public.email_cost_settings for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

create policy "email_cost_settings_update"
  on public.email_cost_settings for update
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Time-bucketed metric snapshots (late-event tolerant, recalculable)
-- ---------------------------------------------------------------------------

create table if not exists public.email_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  bucket_type text not null
    check (bucket_type in ('hour', 'day', 'week', 'month')),
  bucket_start timestamptz not null,
  dimension_type text not null default 'organization'
    check (dimension_type in (
      'organization', 'campaign', 'sequence', 'step',
      'template', 'sender', 'provider', 'segment', 'country', 'language'
    )),
  dimension_id text,
  campaign_id uuid references public.email_campaigns (id) on delete set null,
  sequence_id uuid references public.email_sequences (id) on delete set null,
  sequence_version_id uuid,
  step_id text,
  template_id uuid,
  template_version_id uuid,
  sender_profile_id uuid references public.email_sender_profiles (id) on delete set null,
  provider_code text,
  metrics_json jsonb not null default '{}'::jsonb,
  sample_size integer not null default 0,
  data_quality_json jsonb not null default '[]'::jsonb,
  last_recalculated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists email_analytics_snapshots_unique_idx
  on public.email_analytics_snapshots (
    organization_id,
    bucket_type,
    bucket_start,
    dimension_type,
    coalesce(dimension_id, ''),
    coalesce(campaign_id::text, ''),
    coalesce(sequence_id::text, ''),
    coalesce(template_id::text, ''),
    coalesce(sender_profile_id::text, ''),
    coalesce(provider_code, '')
  );

create index if not exists email_analytics_snapshots_org_bucket_idx
  on public.email_analytics_snapshots (organization_id, bucket_type, bucket_start desc);

create index if not exists email_analytics_snapshots_campaign_idx
  on public.email_analytics_snapshots (organization_id, campaign_id, bucket_start desc);

create trigger email_analytics_snapshots_set_updated_at
before update on public.email_analytics_snapshots
for each row execute function public.set_updated_at();

alter table public.email_analytics_snapshots enable row level security;

create policy "email_analytics_snapshots_select"
  on public.email_analytics_snapshots for select
  to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Attribution records (explainable; confirmed vs estimated)
-- ---------------------------------------------------------------------------

create table if not exists public.email_attribution_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  attribution_model text not null
    check (attribution_model in (
      'none', 'first_touch', 'last_touch', 'campaign_touch',
      'sequence_touch', 'reply_assisted', 'opportunity_linked',
      'deal_linked', 'custom'
    )),
  campaign_id uuid references public.email_campaigns (id) on delete set null,
  campaign_execution_id uuid references public.email_campaign_executions (id) on delete set null,
  sequence_id uuid references public.email_sequences (id) on delete set null,
  enrollment_id uuid references public.email_sequence_enrollments (id) on delete set null,
  queue_item_id uuid references public.email_queue (id) on delete set null,
  lead_id uuid,
  company_id uuid,
  opportunity_id uuid,
  deal_id uuid,
  revenue_amount numeric(14,2) not null default 0,
  currency text not null default 'EUR',
  attribution_confidence text not null default 'estimated'
    check (attribution_confidence in ('confirmed', 'estimated', 'influenced', 'unknown')),
  evidence_json jsonb not null default '{}'::jsonb,
  attributed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists email_attribution_records_deal_model_idx
  on public.email_attribution_records (organization_id, deal_id, attribution_model)
  where deal_id is not null;

create index if not exists email_attribution_records_campaign_idx
  on public.email_attribution_records (organization_id, campaign_id, attributed_at desc);

create index if not exists email_attribution_records_confidence_idx
  on public.email_attribution_records (organization_id, attribution_confidence, attributed_at desc);

create trigger email_attribution_records_set_updated_at
before update on public.email_attribution_records
for each row execute function public.set_updated_at();

alter table public.email_attribution_records enable row level security;

create policy "email_attribution_records_select"
  on public.email_attribution_records for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_attribution_records_insert"
  on public.email_attribution_records for insert
  to authenticated with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Explainable insights
-- ---------------------------------------------------------------------------

create table if not exists public.email_analytics_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  insight_code text not null,
  title text not null,
  explanation text not null,
  metric_code text,
  severity text not null default 'informational'
    check (severity in ('informational', 'positive', 'warning', 'high_priority', 'critical')),
  confidence text not null default 'medium'
    check (confidence in ('low', 'medium', 'high')),
  comparison_json jsonb not null default '{}'::jsonb,
  supporting_data_json jsonb not null default '{}'::jsonb,
  recommended_review_area text,
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'resolved', 'dismissed')),
  generated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_analytics_insights_org_status_idx
  on public.email_analytics_insights (organization_id, status, severity, generated_at desc);

create index if not exists email_analytics_insights_code_idx
  on public.email_analytics_insights (organization_id, insight_code, generated_at desc);

create trigger email_analytics_insights_set_updated_at
before update on public.email_analytics_insights
for each row execute function public.set_updated_at();

alter table public.email_analytics_insights enable row level security;

create policy "email_analytics_insights_select"
  on public.email_analytics_insights for select
  to authenticated using (public.is_org_member(organization_id));

create policy "email_analytics_insights_update"
  on public.email_analytics_insights for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Saved analytics views
-- ---------------------------------------------------------------------------

create table if not exists public.email_saved_analytics_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_user_id uuid not null,
  name text not null,
  visibility text not null default 'private'
    check (visibility in ('private', 'organization')),
  filters_json jsonb not null default '{}'::jsonb,
  date_range_strategy text not null default 'last_30_days',
  comparison_strategy text not null default 'previous_period',
  selected_metrics_json jsonb not null default '[]'::jsonb,
  selected_charts_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_saved_analytics_views_org_owner_idx
  on public.email_saved_analytics_views (organization_id, owner_user_id, updated_at desc);

create trigger email_saved_analytics_views_set_updated_at
before update on public.email_saved_analytics_views
for each row execute function public.set_updated_at();

alter table public.email_saved_analytics_views enable row level security;

create policy "email_saved_analytics_views_select"
  on public.email_saved_analytics_views for select
  to authenticated using (
    public.is_org_member(organization_id)
    and (
      visibility = 'organization'
      or owner_user_id = auth.uid()
    )
  );

create policy "email_saved_analytics_views_insert"
  on public.email_saved_analytics_views for insert
  to authenticated with check (
    public.is_org_member(organization_id)
    and owner_user_id = auth.uid()
  );

create policy "email_saved_analytics_views_update"
  on public.email_saved_analytics_views for update
  to authenticated using (
    public.is_org_member(organization_id)
    and owner_user_id = auth.uid()
  )
  with check (
    public.is_org_member(organization_id)
    and owner_user_id = auth.uid()
  );

create policy "email_saved_analytics_views_delete"
  on public.email_saved_analytics_views for delete
  to authenticated using (
    public.is_org_member(organization_id)
    and owner_user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Recalculation / aggregation runs
-- ---------------------------------------------------------------------------

create table if not exists public.email_analytics_recalculation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_type text not null
    check (job_type in (
      'aggregate_email_metrics',
      'recalculate_campaign_metrics',
      'recalculate_sequence_metrics',
      'recalculate_template_metrics',
      'recalculate_sender_metrics',
      'recalculate_funnel_metrics',
      'recalculate_attribution',
      'generate_insights',
      'repair_analytics_counters'
    )),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  idempotency_key text,
  scope_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists email_analytics_recalculation_runs_idempotency_idx
  on public.email_analytics_recalculation_runs (organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists email_analytics_recalculation_runs_org_status_idx
  on public.email_analytics_recalculation_runs (organization_id, status, created_at desc);

create trigger email_analytics_recalculation_runs_set_updated_at
before update on public.email_analytics_recalculation_runs
for each row execute function public.set_updated_at();

alter table public.email_analytics_recalculation_runs enable row level security;

create policy "email_analytics_recalculation_runs_select"
  on public.email_analytics_recalculation_runs for select
  to authenticated using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Optional campaign cost override
-- ---------------------------------------------------------------------------

alter table public.email_campaigns
  add column if not exists analytics_fixed_cost numeric(12,4),
  add column if not exists analytics_cost_currency text;

comment on table public.email_analytics_snapshots is
  'Phase 21J time-bucketed analytics snapshots. Late events may recalculate historical buckets.';
comment on table public.email_attribution_records is
  'Phase 21J explainable attribution. Confirmed totals must not double-count the same deal.';
