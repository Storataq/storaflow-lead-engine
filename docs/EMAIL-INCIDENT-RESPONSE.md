# Email Incident Response

## Immediate containment

1. Activate Emergency Stop on `/email/operations` or set `EMAIL_EMERGENCY_STOP=true`
2. Disable `EMAIL_PROVIDER_DISPATCH_ENABLED`
3. Pause affected campaign executions
4. Rotate compromised secrets (Resend, tracking, preference, AI, internal)

## Investigate

- Correlation IDs in worker/scheduler logs
- Provider message IDs / webhook events
- Suppression and unsubscribe evidence
- Queue job idempotency keys

## Resolve

- Acknowledge/resolve incident records
- Run reconciliation dry run before repair
- Clear emergency stop only after validation
- Post-incident notes in incident resolution field
