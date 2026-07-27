-- Storaflow — AI Agent Platform (Phase 27A)
-- Additive only. Run manually AFTER 20260726000041_mobile_pwa_experience.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00041.
-- Multi-tenant AI kernel: agents, tasks, memory, tools, costs, approvals.
-- Idempotent.

-- ---------------------------------------------------------------------------
-- Organization AI platform settings
-- ---------------------------------------------------------------------------

create table if not exists public.ai_org_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  default_provider text not null default 'openai'
    check (default_provider in ('openai', 'anthropic', 'gemini', 'azure_openai', 'mistral', 'llama', 'none')),
  default_model text not null default 'gpt-4.1-mini',
  failover_providers jsonb not null default '["openai","anthropic"]'::jsonb,
  approval_mode text not null default 'approval_required'
    check (approval_mode in ('read_only', 'suggest', 'approval_required', 'semi_autonomous', 'fully_autonomous')),
  max_tokens_per_request integer not null default 4096 check (max_tokens_per_request > 0),
  monthly_budget_usd numeric(12,4),
  memory_enabled boolean not null default true,
  logging_enabled boolean not null default true,
  security_strict boolean not null default true,
  rate_limit_per_minute integer not null default 60 check (rate_limit_per_minute > 0),
  prompt_policy_json jsonb not null default '{}'::jsonb,
  tool_policy_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists ai_org_settings_set_updated_at on public.ai_org_settings;
create trigger ai_org_settings_set_updated_at
before update on public.ai_org_settings
for each row execute function public.set_updated_at();

alter table public.ai_org_settings enable row level security;

drop policy if exists "ai_org_settings_select" on public.ai_org_settings;
create policy "ai_org_settings_select"
  on public.ai_org_settings for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "ai_org_settings_write" on public.ai_org_settings;
create policy "ai_org_settings_write"
  on public.ai_org_settings for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Agent registry
-- ---------------------------------------------------------------------------

create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  version text not null default '1.0.0',
  status text not null default 'idle'
    check (status in (
      'created', 'idle', 'planning', 'waiting', 'running',
      'needs_approval', 'paused', 'retrying', 'failed', 'completed', 'cancelled'
    )),
  owner_user_id uuid,
  capabilities_json jsonb not null default '[]'::jsonb,
  tools_json jsonb not null default '[]'::jsonb,
  permissions_json jsonb not null default '{}'::jsonb,
  provider text not null default 'openai',
  model text not null default 'gpt-4.1-mini',
  temperature numeric(4,2) not null default 0.3,
  max_tokens integer not null default 4096,
  timeout_ms integer not null default 60000,
  retry_policy_json jsonb not null default '{"maxRetries":2,"backoffMs":1000}'::jsonb,
  approval_mode text not null default 'approval_required'
    check (approval_mode in ('read_only', 'suggest', 'approval_required', 'semi_autonomous', 'fully_autonomous')),
  logging_enabled boolean not null default true,
  system_prompt text not null default '',
  is_system boolean not null default false,
  deleted_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, slug)
);

create index if not exists ai_agents_org_status_idx
  on public.ai_agents (organization_id, status)
  where deleted_at is null;

drop trigger if exists ai_agents_set_updated_at on public.ai_agents;
create trigger ai_agents_set_updated_at
before update on public.ai_agents
for each row execute function public.set_updated_at();

alter table public.ai_agents enable row level security;

drop policy if exists "ai_agents_select" on public.ai_agents;
create policy "ai_agents_select"
  on public.ai_agents for select
  to authenticated using (public.is_org_member(organization_id) and deleted_at is null);

drop policy if exists "ai_agents_write" on public.ai_agents;
create policy "ai_agents_write"
  on public.ai_agents for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Runs, planner tasks, queue
-- ---------------------------------------------------------------------------

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  agent_id uuid not null references public.ai_agents (id) on delete cascade,
  initiated_by uuid,
  status text not null default 'planning'
    check (status in (
      'planning', 'waiting', 'running', 'needs_approval', 'paused',
      'retrying', 'failed', 'completed', 'cancelled'
    )),
  input_text text not null default '',
  input_json jsonb not null default '{}'::jsonb,
  output_text text,
  output_json jsonb not null default '{}'::jsonb,
  plan_json jsonb not null default '{}'::jsonb,
  error_message text,
  provider text,
  model text,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_usd numeric(12,6) not null default 0,
  latency_ms integer not null default 0,
  approval_status text
    check (approval_status is null or approval_status in ('pending', 'approved', 'rejected', 'bypassed')),
  started_at timestamptz,
  completed_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_runs_org_created_idx
  on public.ai_runs (organization_id, created_at desc);

create index if not exists ai_runs_status_idx
  on public.ai_runs (organization_id, status);

drop trigger if exists ai_runs_set_updated_at on public.ai_runs;
create trigger ai_runs_set_updated_at
before update on public.ai_runs
for each row execute function public.set_updated_at();

alter table public.ai_runs enable row level security;

drop policy if exists "ai_runs_select" on public.ai_runs;
create policy "ai_runs_select"
  on public.ai_runs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "ai_runs_write" on public.ai_runs;
create policy "ai_runs_write"
  on public.ai_runs for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.ai_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.ai_runs (id) on delete cascade,
  parent_task_id uuid references public.ai_tasks (id) on delete set null,
  queue_name text not null default 'default'
    check (queue_name in ('default', 'priority', 'retry', 'dead_letter', 'scheduled')),
  title text not null,
  status text not null default 'queued'
    check (status in (
      'queued', 'scheduled', 'running', 'waiting', 'needs_approval',
      'retrying', 'failed', 'completed', 'cancelled', 'dead'
    )),
  priority integer not null default 100,
  depends_on_json jsonb not null default '[]'::jsonb,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  tool_name text,
  attempt integer not null default 0,
  max_attempts integer not null default 3,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  timeout_ms integer not null default 30000,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_tasks_queue_idx
  on public.ai_tasks (organization_id, queue_name, status, priority, created_at);

drop trigger if exists ai_tasks_set_updated_at on public.ai_tasks;
create trigger ai_tasks_set_updated_at
before update on public.ai_tasks
for each row execute function public.set_updated_at();

alter table public.ai_tasks enable row level security;

drop policy if exists "ai_tasks_select" on public.ai_tasks;
create policy "ai_tasks_select"
  on public.ai_tasks for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "ai_tasks_write" on public.ai_tasks;
create policy "ai_tasks_write"
  on public.ai_tasks for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Memory, knowledge, prompts, tools catalog, approvals, costs, events, logs
-- ---------------------------------------------------------------------------

create table if not exists public.ai_memory_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  memory_scope text not null
    check (memory_scope in (
      'short_term', 'conversation', 'user', 'company', 'agent',
      'workflow', 'shared', 'long_term'
    )),
  scope_key text not null default '',
  agent_id uuid references public.ai_agents (id) on delete set null,
  run_id uuid references public.ai_runs (id) on delete set null,
  user_id uuid,
  company_id uuid,
  content text not null,
  summary text,
  rank_score numeric(8,4) not null default 0,
  embedding_json jsonb not null default '[]'::jsonb,
  expires_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_memory_scope_idx
  on public.ai_memory_entries (organization_id, memory_scope, scope_key, created_at desc);

create index if not exists ai_memory_rank_idx
  on public.ai_memory_entries (organization_id, rank_score desc);

alter table public.ai_memory_entries enable row level security;

drop policy if exists "ai_memory_select" on public.ai_memory_entries;
create policy "ai_memory_select"
  on public.ai_memory_entries for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "ai_memory_write" on public.ai_memory_entries;
create policy "ai_memory_write"
  on public.ai_memory_entries for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.ai_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  source_type text not null
    check (source_type in (
      'crm', 'document', 'faq', 'playbook', 'company_info',
      'policy', 'note', 'web', 'custom'
    )),
  title text not null,
  body text not null default '',
  source_ref text,
  tags_json jsonb not null default '[]'::jsonb,
  chunk_index integer not null default 0,
  embedding_json jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  deleted_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_knowledge_org_idx
  on public.ai_knowledge_documents (organization_id, source_type)
  where deleted_at is null and is_active;

drop trigger if exists ai_knowledge_set_updated_at on public.ai_knowledge_documents;
create trigger ai_knowledge_set_updated_at
before update on public.ai_knowledge_documents
for each row execute function public.set_updated_at();

alter table public.ai_knowledge_documents enable row level security;

drop policy if exists "ai_knowledge_select" on public.ai_knowledge_documents;
create policy "ai_knowledge_select"
  on public.ai_knowledge_documents for select
  to authenticated using (public.is_org_member(organization_id) and deleted_at is null);

drop policy if exists "ai_knowledge_write" on public.ai_knowledge_documents;
create policy "ai_knowledge_write"
  on public.ai_knowledge_documents for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.ai_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  name text not null,
  category text not null default 'general',
  version integer not null default 1,
  locale text not null default 'nl',
  template_body text not null,
  variables_json jsonb not null default '[]'::jsonb,
  parent_slug text,
  ab_variant text,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, slug, version)
);

drop trigger if exists ai_prompt_templates_set_updated_at on public.ai_prompt_templates;
create trigger ai_prompt_templates_set_updated_at
before update on public.ai_prompt_templates
for each row execute function public.set_updated_at();

alter table public.ai_prompt_templates enable row level security;

drop policy if exists "ai_prompts_select" on public.ai_prompt_templates;
create policy "ai_prompts_select"
  on public.ai_prompt_templates for select
  to authenticated using (public.is_org_member(organization_id) and deleted_at is null);

drop policy if exists "ai_prompts_write" on public.ai_prompt_templates;
create policy "ai_prompts_write"
  on public.ai_prompt_templates for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.ai_tool_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  tool_key text not null,
  name text not null,
  description text not null default '',
  version text not null default '1.0.0',
  input_schema_json jsonb not null default '{}'::jsonb,
  output_schema_json jsonb not null default '{}'::jsonb,
  required_permissions_json jsonb not null default '[]'::jsonb,
  timeout_ms integer not null default 15000,
  retry_count integer not null default 1,
  logging_enabled boolean not null default true,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, tool_key, version)
);

-- Allow global system tools (organization_id null) readable by all authenticated
create unique index if not exists ai_tool_definitions_system_key_idx
  on public.ai_tool_definitions (tool_key, version)
  where organization_id is null;

alter table public.ai_tool_definitions enable row level security;

drop policy if exists "ai_tools_select" on public.ai_tool_definitions;
create policy "ai_tools_select"
  on public.ai_tool_definitions for select
  to authenticated using (
    organization_id is null
    or public.is_org_member(organization_id)
  );

drop policy if exists "ai_tools_write" on public.ai_tool_definitions;
create policy "ai_tools_write"
  on public.ai_tool_definitions for all
  to authenticated using (
    organization_id is not null and public.is_org_owner_or_admin(organization_id)
  )
  with check (
    organization_id is not null and public.is_org_owner_or_admin(organization_id)
  );

create table if not exists public.ai_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.ai_runs (id) on delete cascade,
  task_id uuid references public.ai_tasks (id) on delete set null,
  requested_by uuid,
  reviewed_by uuid,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired')),
  action_summary text not null default '',
  payload_json jsonb not null default '{}'::jsonb,
  review_note text,
  created_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz
);

create index if not exists ai_approvals_pending_idx
  on public.ai_approvals (organization_id, status, created_at desc);

alter table public.ai_approvals enable row level security;

drop policy if exists "ai_approvals_select" on public.ai_approvals;
create policy "ai_approvals_select"
  on public.ai_approvals for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "ai_approvals_write" on public.ai_approvals;
create policy "ai_approvals_write"
  on public.ai_approvals for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.ai_cost_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid,
  agent_id uuid references public.ai_agents (id) on delete set null,
  run_id uuid references public.ai_runs (id) on delete set null,
  provider text not null,
  model text not null,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_usd numeric(12,6) not null default 0,
  day_key date not null default (timezone('utc', now())::date),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_cost_ledger_org_day_idx
  on public.ai_cost_ledger (organization_id, day_key desc);

alter table public.ai_cost_ledger enable row level security;

drop policy if exists "ai_cost_select" on public.ai_cost_ledger;
create policy "ai_cost_select"
  on public.ai_cost_ledger for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "ai_cost_insert" on public.ai_cost_ledger;
create policy "ai_cost_insert"
  on public.ai_cost_ledger for insert
  to authenticated with check (public.is_org_member(organization_id));

create table if not exists public.ai_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_type text not null,
  agent_id uuid,
  run_id uuid,
  task_id uuid,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_events_org_created_idx
  on public.ai_events (organization_id, created_at desc);

alter table public.ai_events enable row level security;

drop policy if exists "ai_events_select" on public.ai_events;
create policy "ai_events_select"
  on public.ai_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "ai_events_insert" on public.ai_events;
create policy "ai_events_insert"
  on public.ai_events for insert
  to authenticated with check (public.is_org_member(organization_id));

create table if not exists public.ai_execution_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid references public.ai_runs (id) on delete cascade,
  task_id uuid references public.ai_tasks (id) on delete set null,
  agent_id uuid,
  user_id uuid,
  provider text,
  model text,
  tool_name text,
  input_preview text not null default '',
  output_preview text not null default '',
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_usd numeric(12,6) not null default 0,
  latency_ms integer not null default 0,
  approval_status text,
  error_message text,
  security_flags_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_execution_logs_org_idx
  on public.ai_execution_logs (organization_id, created_at desc);

alter table public.ai_execution_logs enable row level security;

drop policy if exists "ai_logs_select" on public.ai_execution_logs;
create policy "ai_logs_select"
  on public.ai_execution_logs for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "ai_logs_insert" on public.ai_execution_logs;
create policy "ai_logs_insert"
  on public.ai_execution_logs for insert
  to authenticated with check (public.is_org_member(organization_id));

create table if not exists public.ai_workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  definition_json jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('draft', 'active', 'paused', 'archived')),
  deleted_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, slug)
);

drop trigger if exists ai_workflows_set_updated_at on public.ai_workflows;
create trigger ai_workflows_set_updated_at
before update on public.ai_workflows
for each row execute function public.set_updated_at();

alter table public.ai_workflows enable row level security;

drop policy if exists "ai_workflows_select" on public.ai_workflows;
create policy "ai_workflows_select"
  on public.ai_workflows for select
  to authenticated using (public.is_org_member(organization_id) and deleted_at is null);

drop policy if exists "ai_workflows_write" on public.ai_workflows;
create policy "ai_workflows_write"
  on public.ai_workflows for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Seed system tool definitions (global)
-- ---------------------------------------------------------------------------

insert into public.ai_tool_definitions (
  organization_id, tool_key, name, description, version,
  input_schema_json, output_schema_json, required_permissions_json, is_system
)
select v.organization_id, v.tool_key, v.name, v.description, v.version,
       v.input_schema_json, v.output_schema_json, v.required_permissions_json, v.is_system
from (
  values
    (null::uuid, 'crm.search_companies', 'Search companies', 'Search organization companies', '1.0.0',
     '{"type":"object","properties":{"query":{"type":"string"},"limit":{"type":"number"}},"required":["query"]}'::jsonb,
     '{"type":"object","properties":{"items":{"type":"array"}}}'::jsonb,
     '["companies:read"]'::jsonb, true),
    (null::uuid, 'crm.search_contacts', 'Search contacts', 'Search CRM contacts', '1.0.0',
     '{"type":"object","properties":{"query":{"type":"string"},"limit":{"type":"number"}},"required":["query"]}'::jsonb,
     '{"type":"object","properties":{"items":{"type":"array"}}}'::jsonb,
     '["contacts:read"]'::jsonb, true),
    (null::uuid, 'crm.search_deals', 'Search deals', 'Search CRM deals', '1.0.0',
     '{"type":"object","properties":{"query":{"type":"string"},"limit":{"type":"number"}},"required":["query"]}'::jsonb,
     '{"type":"object","properties":{"items":{"type":"array"}}}'::jsonb,
     '["deals:read"]'::jsonb, true),
    (null::uuid, 'crm.list_tasks', 'List tasks', 'List open CRM tasks', '1.0.0',
     '{"type":"object","properties":{"limit":{"type":"number"}}}'::jsonb,
     '{"type":"object","properties":{"items":{"type":"array"}}}'::jsonb,
     '["tasks:read"]'::jsonb, true),
    (null::uuid, 'memory.save', 'Save memory', 'Persist an AI memory entry', '1.0.0',
     '{"type":"object","properties":{"scope":{"type":"string"},"content":{"type":"string"}},"required":["scope","content"]}'::jsonb,
     '{"type":"object","properties":{"id":{"type":"string"}}}'::jsonb,
     '["memory:write"]'::jsonb, true),
    (null::uuid, 'memory.recall', 'Recall memory', 'Retrieve ranked memory entries', '1.0.0',
     '{"type":"object","properties":{"scope":{"type":"string"},"query":{"type":"string"},"limit":{"type":"number"}}}'::jsonb,
     '{"type":"object","properties":{"items":{"type":"array"}}}'::jsonb,
     '["memory:read"]'::jsonb, true),
    (null::uuid, 'knowledge.search', 'Search knowledge', 'RAG-ready knowledge search', '1.0.0',
     '{"type":"object","properties":{"query":{"type":"string"},"limit":{"type":"number"}},"required":["query"]}'::jsonb,
     '{"type":"object","properties":{"items":{"type":"array"}}}'::jsonb,
     '["knowledge:read"]'::jsonb, true),
    (null::uuid, 'analytics.summary', 'Analytics summary', 'Organization activity summary', '1.0.0',
     '{"type":"object","properties":{}}'::jsonb,
     '{"type":"object"}'::jsonb,
     '["analytics:read"]'::jsonb, true)
) as v(organization_id, tool_key, name, description, version, input_schema_json, output_schema_json, required_permissions_json, is_system)
where not exists (
  select 1
  from public.ai_tool_definitions t
  where t.organization_id is null
    and t.tool_key = v.tool_key
    and t.version = v.version
);
