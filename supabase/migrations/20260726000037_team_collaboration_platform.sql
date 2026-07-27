-- Storaflow — Team Collaboration Platform (Phase 26D)
-- Additive only. Run manually AFTER 20260726000036_white_label_platform.sql
-- Do NOT auto-execute from the app.
-- Do NOT modify migrations 00001–00036.
-- Org-scoped collaboration; RLS isolation. Idempotent.

-- ---------------------------------------------------------------------------
-- Shared entity types for polymorphic comments / attachments / activity
-- ---------------------------------------------------------------------------
-- entity_type values (app-enforced): company, contact, deal, task, campaign,
-- automation, report, analytics, attachment, comment, note, knowledge_article,
-- meeting, team

-- ---------------------------------------------------------------------------
-- Comments (threaded, mentions-ready, pin/resolve)
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  parent_id uuid references public.collaboration_comments (id) on delete cascade,
  body_html text not null default '',
  body_text text not null default '',
  rich_json jsonb not null default '{}'::jsonb,
  is_pinned boolean not null default false,
  is_resolved boolean not null default false,
  resolved_by uuid,
  resolved_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists collaboration_comments_entity_idx
  on public.collaboration_comments (organization_id, entity_type, entity_id, created_at desc)
  where deleted_at is null;

create index if not exists collaboration_comments_parent_idx
  on public.collaboration_comments (parent_id)
  where deleted_at is null;

drop trigger if exists collaboration_comments_set_updated_at on public.collaboration_comments;
create trigger collaboration_comments_set_updated_at
before update on public.collaboration_comments
for each row execute function public.set_updated_at();

alter table public.collaboration_comments enable row level security;

drop policy if exists "collaboration_comments_select" on public.collaboration_comments;
create policy "collaboration_comments_select"
  on public.collaboration_comments for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "collaboration_comments_insert" on public.collaboration_comments;
create policy "collaboration_comments_insert"
  on public.collaboration_comments for insert
  to authenticated with check (public.is_org_member(organization_id));

drop policy if exists "collaboration_comments_update" on public.collaboration_comments;
create policy "collaboration_comments_update"
  on public.collaboration_comments for update
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "collaboration_comments_delete" on public.collaboration_comments;
create policy "collaboration_comments_delete"
  on public.collaboration_comments for delete
  to authenticated using (public.is_org_owner_or_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Mentions (@user / @team / @everyone)
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_mentions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  comment_id uuid references public.collaboration_comments (id) on delete cascade,
  note_id uuid,
  mention_type text not null
    check (mention_type in ('user', 'team', 'everyone')),
  mentioned_user_id uuid,
  mentioned_team_id uuid,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists collaboration_mentions_org_user_idx
  on public.collaboration_mentions (organization_id, mentioned_user_id, created_at desc);

alter table public.collaboration_mentions enable row level security;

drop policy if exists "collaboration_mentions_select" on public.collaboration_mentions;
create policy "collaboration_mentions_select"
  on public.collaboration_mentions for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "collaboration_mentions_write" on public.collaboration_mentions;
create policy "collaboration_mentions_write"
  on public.collaboration_mentions for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Notifications (in-app; email/push/slack/teams ready)
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recipient_user_id uuid not null,
  actor_user_id uuid,
  event_type text not null,
  title text not null,
  body text not null default '',
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  entity_type text,
  entity_id uuid,
  channel_flags jsonb not null default '{"in_app":true,"email":false,"push":false,"slack":false,"teams":false}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  is_archived boolean not null default false,
  dismissed_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists collaboration_notifications_inbox_idx
  on public.collaboration_notifications (organization_id, recipient_user_id, is_read, created_at desc)
  where dismissed_at is null;

alter table public.collaboration_notifications enable row level security;

drop policy if exists "collaboration_notifications_select" on public.collaboration_notifications;
create policy "collaboration_notifications_select"
  on public.collaboration_notifications for select
  to authenticated using (
    public.is_org_member(organization_id)
    and recipient_user_id = auth.uid()
  );

drop policy if exists "collaboration_notifications_update" on public.collaboration_notifications;
create policy "collaboration_notifications_update"
  on public.collaboration_notifications for update
  to authenticated using (
    public.is_org_member(organization_id)
    and recipient_user_id = auth.uid()
  )
  with check (
    public.is_org_member(organization_id)
    and recipient_user_id = auth.uid()
  );

drop policy if exists "collaboration_notifications_insert" on public.collaboration_notifications;
create policy "collaboration_notifications_insert"
  on public.collaboration_notifications for insert
  to authenticated with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Attachments (virus-scan / version ready)
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  content_type text not null,
  byte_size integer not null default 0,
  storage_url text,
  data_url text,
  checksum text,
  virus_scan_status text not null default 'pending'
    check (virus_scan_status in ('pending', 'clean', 'infected', 'skipped', 'error')),
  version integer not null default 1,
  preview_ready boolean not null default false,
  uploaded_by uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists collaboration_attachments_entity_idx
  on public.collaboration_attachments (organization_id, entity_type, entity_id)
  where deleted_at is null;

drop trigger if exists collaboration_attachments_set_updated_at on public.collaboration_attachments;
create trigger collaboration_attachments_set_updated_at
before update on public.collaboration_attachments
for each row execute function public.set_updated_at();

alter table public.collaboration_attachments enable row level security;

drop policy if exists "collaboration_attachments_select" on public.collaboration_attachments;
create policy "collaboration_attachments_select"
  on public.collaboration_attachments for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "collaboration_attachments_write" on public.collaboration_attachments;
create policy "collaboration_attachments_write"
  on public.collaboration_attachments for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Team spaces
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  description text not null default '',
  team_type text not null default 'custom'
    check (team_type in ('sales', 'marketing', 'support', 'management', 'custom')),
  permissions_json jsonb not null default '{"view":true,"comment":true,"mention":true,"upload":true,"delete":false,"moderate":false,"manage_teams":false}'::jsonb,
  pinned_json jsonb not null default '[]'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create index if not exists collaboration_teams_org_idx
  on public.collaboration_teams (organization_id, status);

drop trigger if exists collaboration_teams_set_updated_at on public.collaboration_teams;
create trigger collaboration_teams_set_updated_at
before update on public.collaboration_teams
for each row execute function public.set_updated_at();

alter table public.collaboration_teams enable row level security;

drop policy if exists "collaboration_teams_select" on public.collaboration_teams;
create policy "collaboration_teams_select"
  on public.collaboration_teams for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "collaboration_teams_write" on public.collaboration_teams;
create policy "collaboration_teams_write"
  on public.collaboration_teams for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.collaboration_team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  team_id uuid not null references public.collaboration_teams (id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member'
    check (role in ('member', 'manager')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (team_id, user_id)
);

create index if not exists collaboration_team_members_user_idx
  on public.collaboration_team_members (organization_id, user_id);

alter table public.collaboration_team_members enable row level security;

drop policy if exists "collaboration_team_members_select" on public.collaboration_team_members;
create policy "collaboration_team_members_select"
  on public.collaboration_team_members for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "collaboration_team_members_write" on public.collaboration_team_members;
create policy "collaboration_team_members_write"
  on public.collaboration_team_members for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

-- FK for mentions.team after teams exist
do $$ begin
  alter table public.collaboration_mentions
    add constraint collaboration_mentions_team_fk
    foreign key (mentioned_team_id) references public.collaboration_teams (id) on delete cascade;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Knowledge base
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_knowledge_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, slug)
);

alter table public.collaboration_knowledge_categories enable row level security;

drop policy if exists "collaboration_knowledge_categories_select" on public.collaboration_knowledge_categories;
create policy "collaboration_knowledge_categories_select"
  on public.collaboration_knowledge_categories for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "collaboration_knowledge_categories_write" on public.collaboration_knowledge_categories;
create policy "collaboration_knowledge_categories_write"
  on public.collaboration_knowledge_categories for all
  to authenticated using (public.is_org_owner_or_admin(organization_id))
  with check (public.is_org_owner_or_admin(organization_id));

create table if not exists public.collaboration_knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid references public.collaboration_knowledge_categories (id) on delete set null,
  title text not null,
  slug text not null,
  body_html text not null default '',
  body_text text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  version integer not null default 1,
  permissions_json jsonb not null default '{"view":"org","comment":"org","edit":"admin"}'::jsonb,
  created_by uuid,
  updated_by uuid,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, slug)
);

create index if not exists collaboration_knowledge_articles_search_idx
  on public.collaboration_knowledge_articles (organization_id, status, updated_at desc);

drop trigger if exists collaboration_knowledge_articles_set_updated_at on public.collaboration_knowledge_articles;
create trigger collaboration_knowledge_articles_set_updated_at
before update on public.collaboration_knowledge_articles
for each row execute function public.set_updated_at();

alter table public.collaboration_knowledge_articles enable row level security;

drop policy if exists "collaboration_knowledge_articles_select" on public.collaboration_knowledge_articles;
create policy "collaboration_knowledge_articles_select"
  on public.collaboration_knowledge_articles for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "collaboration_knowledge_articles_write" on public.collaboration_knowledge_articles;
create policy "collaboration_knowledge_articles_write"
  on public.collaboration_knowledge_articles for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Collaborative notes
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_shared_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  team_id uuid references public.collaboration_teams (id) on delete set null,
  title text not null,
  body_html text not null default '',
  body_text text not null default '',
  rich_json jsonb not null default '{}'::jsonb,
  is_pinned boolean not null default false,
  version integer not null default 1,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists collaboration_shared_notes_org_idx
  on public.collaboration_shared_notes (organization_id, updated_at desc);

drop trigger if exists collaboration_shared_notes_set_updated_at on public.collaboration_shared_notes;
create trigger collaboration_shared_notes_set_updated_at
before update on public.collaboration_shared_notes
for each row execute function public.set_updated_at();

alter table public.collaboration_shared_notes enable row level security;

drop policy if exists "collaboration_shared_notes_select" on public.collaboration_shared_notes;
create policy "collaboration_shared_notes_select"
  on public.collaboration_shared_notes for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "collaboration_shared_notes_write" on public.collaboration_shared_notes;
create policy "collaboration_shared_notes_write"
  on public.collaboration_shared_notes for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

do $$ begin
  alter table public.collaboration_mentions
    add constraint collaboration_mentions_note_fk
    foreign key (note_id) references public.collaboration_shared_notes (id) on delete cascade;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Meetings (scaffolding)
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  agenda_html text not null default '',
  notes_html text not null default '',
  scheduled_at timestamptz,
  ended_at timestamptz,
  participants_json jsonb not null default '[]'::jsonb,
  action_items_json jsonb not null default '[]'::jsonb,
  linked_company_ids jsonb not null default '[]'::jsonb,
  linked_deal_ids jsonb not null default '[]'::jsonb,
  linked_contact_ids jsonb not null default '[]'::jsonb,
  status text not null default 'scheduled'
    check (status in ('draft', 'scheduled', 'completed', 'cancelled')),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists collaboration_meetings_org_idx
  on public.collaboration_meetings (organization_id, scheduled_at desc nulls last);

drop trigger if exists collaboration_meetings_set_updated_at on public.collaboration_meetings;
create trigger collaboration_meetings_set_updated_at
before update on public.collaboration_meetings
for each row execute function public.set_updated_at();

alter table public.collaboration_meetings enable row level security;

drop policy if exists "collaboration_meetings_select" on public.collaboration_meetings;
create policy "collaboration_meetings_select"
  on public.collaboration_meetings for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "collaboration_meetings_write" on public.collaboration_meetings;
create policy "collaboration_meetings_write"
  on public.collaboration_meetings for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Task collaboration extensions (watchers, checklists, dependencies, subtasks)
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_task_watchers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  task_id uuid not null references public.crm_tasks (id) on delete cascade,
  user_id uuid not null,
  role text not null default 'watcher'
    check (role in ('watcher', 'follower')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (task_id, user_id)
);

alter table public.collaboration_task_watchers enable row level security;

drop policy if exists "collaboration_task_watchers_select" on public.collaboration_task_watchers;
create policy "collaboration_task_watchers_select"
  on public.collaboration_task_watchers for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "collaboration_task_watchers_write" on public.collaboration_task_watchers;
create policy "collaboration_task_watchers_write"
  on public.collaboration_task_watchers for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.collaboration_task_checklists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  task_id uuid not null references public.crm_tasks (id) on delete cascade,
  title text not null default 'Checklist',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.collaboration_task_checklists enable row level security;

drop policy if exists "collaboration_task_checklists_all" on public.collaboration_task_checklists;
create policy "collaboration_task_checklists_all"
  on public.collaboration_task_checklists for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.collaboration_task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  checklist_id uuid not null references public.collaboration_task_checklists (id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.collaboration_task_checklist_items enable row level security;

drop policy if exists "collaboration_task_checklist_items_all" on public.collaboration_task_checklist_items;
create policy "collaboration_task_checklist_items_all"
  on public.collaboration_task_checklist_items for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.collaboration_task_dependencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  task_id uuid not null references public.crm_tasks (id) on delete cascade,
  depends_on_task_id uuid not null references public.crm_tasks (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

alter table public.collaboration_task_dependencies enable row level security;

drop policy if exists "collaboration_task_dependencies_all" on public.collaboration_task_dependencies;
create policy "collaboration_task_dependencies_all"
  on public.collaboration_task_dependencies for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.collaboration_task_subtasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  parent_task_id uuid not null references public.crm_tasks (id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  sort_order integer not null default 0,
  assigned_user_id uuid,
  due_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.collaboration_task_subtasks enable row level security;

drop policy if exists "collaboration_task_subtasks_all" on public.collaboration_task_subtasks;
create policy "collaboration_task_subtasks_all"
  on public.collaboration_task_subtasks for all
  to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Favorites + collaboration audit
-- ---------------------------------------------------------------------------

create table if not exists public.collaboration_favorites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, entity_type, entity_id)
);

alter table public.collaboration_favorites enable row level security;

drop policy if exists "collaboration_favorites_all" on public.collaboration_favorites;
create policy "collaboration_favorites_all"
  on public.collaboration_favorites for all
  to authenticated using (
    public.is_org_member(organization_id) and user_id = auth.uid()
  )
  with check (
    public.is_org_member(organization_id) and user_id = auth.uid()
  );

create table if not exists public.collaboration_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  description text not null default '',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists collaboration_audit_events_org_idx
  on public.collaboration_audit_events (organization_id, created_at desc);

alter table public.collaboration_audit_events enable row level security;

drop policy if exists "collaboration_audit_events_select" on public.collaboration_audit_events;
create policy "collaboration_audit_events_select"
  on public.collaboration_audit_events for select
  to authenticated using (public.is_org_member(organization_id));

drop policy if exists "collaboration_audit_events_insert" on public.collaboration_audit_events;
create policy "collaboration_audit_events_insert"
  on public.collaboration_audit_events for insert
  to authenticated with check (public.is_org_member(organization_id));
