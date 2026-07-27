-- Lead Engine — Email Provider Integration (Phase 21F)
-- Additive only. Run manually AFTER 20260726000015_email_execution_engine.sql
-- Do NOT auto-execute from the app.

-- ---------------------------------------------------------------------------
-- Extend sender profiles with provider selection metadata
-- ---------------------------------------------------------------------------

alter table public.email_sender_profiles
  add column if not exists provider_code text not null default 'resend'
    check (provider_code in ('none', 'resend', 'postmark', 'sendgrid', 'ses', 'smtp', 'custom')),
  add column if not exists verified_at timestamptz;

create index if not exists email_sender_profiles_org_provider_idx
  on public.email_sender_profiles (organization_id, provider_code, updated_at desc);

-- ---------------------------------------------------------------------------
-- Extend outbound email queue for real provider dispatch correlation
-- ---------------------------------------------------------------------------

alter table public.email_queue
  add column if not exists campaign_execution_id uuid
    references public.email_campaign_executions (id) on delete set null,
  add column if not exists enrollment_id uuid
    references public.email_sequence_enrollments (id) on delete set null,
  add column if not exists step_execution_id uuid
    references public.email_step_executions (id) on delete set null,
  add column if not exists rendered_message_id uuid
    references public.email_rendered_messages (id) on delete set null,
  add column if not exists sender_profile_id uuid
    references public.email_sender_profiles (id) on delete set null,
  add column if not exists template_version_id uuid
    references public.email_template_versions (id) on delete set null,
  add column if not exists from_name text,
  add column if not exists from_email text,
  add column if not exists reply_to_email text,
  add column if not exists idempotency_key text,
  add column if not exists provider_status text,
  add column if not exists provider_payload_json jsonb not null default '{}'::jsonb,
  add column if not exists accepted_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists failed_at timestamptz;

create index if not exists email_queue_provider_message_idx
  on public.email_queue (organization_id, provider_code, provider_message_id);

create index if not exists email_queue_step_execution_idx
  on public.email_queue (organization_id, step_execution_id, created_at desc);

create unique index if not exists email_queue_org_idempotency_idx
  on public.email_queue (organization_id, idempotency_key)
  where idempotency_key is not null;

comment on column public.email_queue.idempotency_key is
  'Stable outbound provider dispatch idempotency key (Phase 21F).';
comment on column public.email_queue.provider_payload_json is
  'Safe provider request/response metadata only. Never store secrets.';

