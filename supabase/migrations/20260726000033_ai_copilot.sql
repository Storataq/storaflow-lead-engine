-- Storaflow — AI Copilot (Phase 25H)
-- Additive only. Run manually AFTER 20260726000032_executive_analytics_dashboard.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00032.
-- Idempotent: safe to re-run after partial execution.

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------

create table if not exists public.copilot_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null,
  title text not null default 'New conversation',
  status text not null default 'active'
    check (status in ('active', 'archived')),
  mode text not null default 'floating'
    check (mode in ('floating', 'sidebar', 'docked', 'fullscreen')),
  is_pinned boolean not null default false,
  is_favorite boolean not null default false,
  context_json jsonb not null default '{}'::jsonb,
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists copilot_conversations_org_user_idx
  on public.copilot_conversations (organization_id, user_id, updated_at desc);

create index if not exists copilot_conversations_pinned_idx
  on public.copilot_conversations (organization_id, user_id)
  where is_pinned = true or is_favorite = true;

drop trigger if exists copilot_conversations_set_updated_at on public.copilot_conversations;
create trigger copilot_conversations_set_updated_at
before update on public.copilot_conversations
for each row execute function public.set_updated_at();

alter table public.copilot_conversations enable row level security;

drop policy if exists "copilot_conversations_select" on public.copilot_conversations;
create policy "copilot_conversations_select"
  on public.copilot_conversations for select
  to authenticated
  using (
    public.is_org_member(organization_id)
    and user_id = auth.uid()
  );

drop policy if exists "copilot_conversations_write" on public.copilot_conversations;
create policy "copilot_conversations_write"
  on public.copilot_conversations for all
  to authenticated
  using (
    public.is_org_member(organization_id)
    and user_id = auth.uid()
  )
  with check (
    public.is_org_member(organization_id)
    and user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------

create table if not exists public.copilot_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  conversation_id uuid not null references public.copilot_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  intent text,
  payload_json jsonb not null default '{}'::jsonb,
  action_proposals_json jsonb not null default '[]'::jsonb,
  provider_code text,
  model text,
  latency_ms integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists copilot_messages_conversation_idx
  on public.copilot_messages (conversation_id, created_at asc);

create index if not exists copilot_messages_org_idx
  on public.copilot_messages (organization_id, created_at desc);

alter table public.copilot_messages enable row level security;

drop policy if exists "copilot_messages_select" on public.copilot_messages;
create policy "copilot_messages_select"
  on public.copilot_messages for select
  to authenticated
  using (
    public.is_org_member(organization_id)
    and exists (
      select 1 from public.copilot_conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
        and c.organization_id = organization_id
    )
  );

drop policy if exists "copilot_messages_write" on public.copilot_messages;
create policy "copilot_messages_write"
  on public.copilot_messages for all
  to authenticated
  using (
    public.is_org_member(organization_id)
    and exists (
      select 1 from public.copilot_conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
        and c.organization_id = organization_id
    )
  )
  with check (
    public.is_org_member(organization_id)
    and exists (
      select 1 from public.copilot_conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
        and c.organization_id = organization_id
    )
  );

-- ---------------------------------------------------------------------------
-- Saved prompts / favorites
-- ---------------------------------------------------------------------------

create table if not exists public.copilot_prompts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid,
  code text,
  title text not null,
  prompt_text text not null,
  category text not null default 'general',
  is_system boolean not null default false,
  is_favorite boolean not null default false,
  use_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists copilot_prompts_org_idx
  on public.copilot_prompts (organization_id, category, use_count desc);

drop trigger if exists copilot_prompts_set_updated_at on public.copilot_prompts;
create trigger copilot_prompts_set_updated_at
before update on public.copilot_prompts
for each row execute function public.set_updated_at();

alter table public.copilot_prompts enable row level security;

drop policy if exists "copilot_prompts_select" on public.copilot_prompts;
create policy "copilot_prompts_select"
  on public.copilot_prompts for select
  to authenticated
  using (
    public.is_org_member(organization_id)
    and (is_system = true or user_id = auth.uid() or user_id is null)
  );

drop policy if exists "copilot_prompts_write" on public.copilot_prompts;
create policy "copilot_prompts_write"
  on public.copilot_prompts for all
  to authenticated
  using (
    public.is_org_member(organization_id)
    and is_system = false
    and (user_id = auth.uid() or user_id is null)
  )
  with check (
    public.is_org_member(organization_id)
    and is_system = false
  );

-- ---------------------------------------------------------------------------
-- Action audit (proposals + confirmations)
-- ---------------------------------------------------------------------------

create table if not exists public.copilot_action_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  conversation_id uuid references public.copilot_conversations (id) on delete set null,
  message_id uuid references public.copilot_messages (id) on delete set null,
  user_id uuid not null,
  action_type text not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'executed', 'cancelled', 'failed')),
  preview_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  error_message text,
  confirmed_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists copilot_action_runs_org_idx
  on public.copilot_action_runs (organization_id, created_at desc);

alter table public.copilot_action_runs enable row level security;

drop policy if exists "copilot_action_runs_select" on public.copilot_action_runs;
create policy "copilot_action_runs_select"
  on public.copilot_action_runs for select
  to authenticated
  using (
    public.is_org_member(organization_id)
    and user_id = auth.uid()
  );

drop policy if exists "copilot_action_runs_write" on public.copilot_action_runs;
create policy "copilot_action_runs_write"
  on public.copilot_action_runs for all
  to authenticated
  using (
    public.is_org_member(organization_id)
    and user_id = auth.uid()
  )
  with check (
    public.is_org_member(organization_id)
    and user_id = auth.uid()
  );
