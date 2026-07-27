# Email Execution Engine (Phase 21E)

This phase introduces the internal execution architecture that turns an approved campaign + a published sequence version into:

- Recipient enrollments (`email_sequence_enrollments`)
- Step executions (`email_step_executions`)
- Internal queue jobs (`email_queue_jobs`)
- Rendered email snapshots (`email_rendered_messages`)

Important constraints:

- No external email provider is called.
- No delivery tracking events are produced.
- Rendered snapshots are produced deterministically from stored template/step snapshots + recipient personalization data.

## Core lifecycle

1. Start execution for an approved campaign (`startCampaignExecutionAction`)
2. Create enrollments for eligible snapshot recipients (idempotent)
3. Create step executions + internal queue jobs for the first step
4. Scheduler/worker (internal endpoints) claims due queue jobs
5. Worker processes:
   - `email` steps → render snapshots + schedule the next step
   - `wait` steps → mark completed + schedule the next step
   - `condition` steps → evaluate deterministic condition config + schedule the selected branch
   - `manual_task` steps → block by default (waiting until manual completion in a later phase)
   - `end` steps → complete enrollment and stop remaining jobs

## Internal endpoints (manual operational use)

- Scheduler run: `POST /api/internal/email/execution/scheduler-run`
- Worker run: `POST /api/internal/email/execution/worker-run`

Both endpoints require `x-email-execution-secret` matching `EMAIL_EXECUTION_INTERNAL_SECRET`.

## Known limitations (Phase 21E implementation)

- Pause/resume currently only affects step-level stop-rule evaluation when `stop_on_manual_pause` is configured.
- Retry/dead-letter handling is not fully implemented for worker failures yet.
- Manual tasks block progression in this phase; no manual completion workflow is wired.

