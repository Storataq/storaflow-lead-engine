# Email Execution Queue (Phase 21E)

Phase 21E adds an internal queue for sequence execution preparation and rendered-message snapshotting.

## Queue model

Queue rows are stored in `email_queue_jobs` and use org-scoped RLS:

- `status`: `pending`, `scheduled`, `available`, `locked`, `processing`, `completed`, `retry`, `failed`, `cancelled`, `dead_letter`
- `scheduled_for`: when the job becomes eligible
- `locked_by`, `lease_expires_at`: worker lease / claim window
- `idempotency_key`: prevents duplicate job creation

## Safe claiming

Workers claim jobs using the database RPC:

`public.claim_email_execution_queue_jobs(p_organization_id, p_worker_id, ...)`

This RPC uses an atomic claim pattern and lease expiration, preventing two workers from processing the same job concurrently.

