# Email Scheduler (Phase 21E)

The scheduler in Phase 21E is an internal operation that releases due queue jobs.

## Scheduler run

`POST /api/internal/email/execution/scheduler-run`

It creates an `email_scheduler_runs` record and updates due queue rows:

- from `scheduled` → `available`
- based on `scheduled_for <= now`

Workers can also claim `scheduled` jobs directly, but the scheduler-run endpoint provides an explicit operational hook and run history.

