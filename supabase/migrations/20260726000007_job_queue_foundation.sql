-- Fase 5: Job Queue & Worker Engine foundation
-- Additive only. Does NOT alter existing RLS policies (only adds scrape_jobs_delete).
-- Run manually in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- Status: draft (job created but not yet started)
-- ---------------------------------------------------------------------------

alter type public.scrape_job_status add value if not exists 'draft';

-- ---------------------------------------------------------------------------
-- Priority + retry + pages_total
-- ---------------------------------------------------------------------------

alter table public.scrape_jobs
  add column if not exists priority text not null default 'NORMAL',
  add column if not exists retry_count integer not null default 0,
  add column if not exists pages_total integer not null default 5;

alter table public.scrape_jobs
  drop constraint if exists scrape_jobs_priority_check;

alter table public.scrape_jobs
  add constraint scrape_jobs_priority_check
  check (priority in ('LOW', 'NORMAL', 'HIGH', 'CRITICAL'));

-- Backfill pages_total from target_pages when present
update public.scrape_jobs
set pages_total = greatest(coalesce(target_pages, 5), 1)
where coalesce(pages_total, 0) <= 0
   or pages_total is distinct from coalesce(target_pages, pages_total);

create index if not exists scrape_jobs_queue_priority_idx
  on public.scrape_jobs (organization_id, status, priority, created_at);

comment on column public.scrape_jobs.priority is
  'Queue priority: LOW | NORMAL | HIGH | CRITICAL (scheduling later)';
comment on column public.scrape_jobs.retry_count is
  'How many times this job lineage was retried';
comment on column public.scrape_jobs.pages_total is
  'Target pages for progress (alias of target_pages; kept in sync by app)';

-- ---------------------------------------------------------------------------
-- NEW delete policy only (existing select/insert/update untouched)
-- ---------------------------------------------------------------------------

drop policy if exists "scrape_jobs_delete" on public.scrape_jobs;

create policy "scrape_jobs_delete" on public.scrape_jobs
  for delete to authenticated
  using (public.is_org_owner_or_admin(organization_id));
