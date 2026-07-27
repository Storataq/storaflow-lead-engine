# Email Operations (Phase 21L)

## Dashboard

Route: `/email/operations` (owners/admins for controls)

Shows: overall health, queue backlog, component statuses, emergency stop, test mode, allowlist, reconciliation dry runs, incidents, E2E harness.

## Kill switches

Env + org table `email_emergency_controls`:

- `EMAIL_EMERGENCY_STOP`
- `EMAIL_PROVIDER_DISPATCH_ENABLED` (default false)
- `EMAIL_TEST_MODE` (default true)
- Org `emergency_stop`, `provider_dispatch_enabled`, `test_mode`

## Health endpoints (secret protected)

Header: `x-email-health-secret` (or execution secret)

- `GET /api/internal/health`
- `GET /api/internal/health/email?organizationId=`
- `GET /api/internal/health/queue?organizationId=`
- `GET /api/internal/health/provider`

## Worker / scheduler

```
POST /api/internal/email/execution/worker-run
POST /api/internal/email/execution/scheduler-run
Header: x-email-execution-secret
```

Worker live dispatch requires `live: true` **and** env dispatch enabled **and** org control enabled **and** no emergency stop. Otherwise simulation skips `provider.send`.

## Circuit breaker

Org consecutive provider failures → `provider_circuit_state=open` when threshold reached.
