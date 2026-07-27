# Email End-to-End Testing

## Controlled harness

UI: `/email/operations` → “Run controlled E2E harness”  
Code: `src/lib/email/ops/e2e-harness.ts`  
Persists to `email_e2e_test_runs` (after migration 00022).

Never sends to uncontrolled recipients.

## Manual matrix

| Scenario | Local | Preview | Prod test mode | Pilot |
|---|---|---|---|---|
| Happy path (simulation) | ✓ | ✓ | ✓ | ✓ |
| Allowlisted live send | | | ✓ | ✓ |
| Invalid sender | ✓ | ✓ | ✓ | ✓ |
| Suppressed recipient | ✓ | ✓ | ✓ | ✓ |
| Duplicate webhook | ✓ | ✓ | ✓ | ✓ |
| Unsubscribe / complaint | ✓ | ✓ | ✓ | ✓ |
| Emergency stop | ✓ | ✓ | ✓ | ✓ |
| Cross-org denial | ✓ | ✓ | ✓ | ✓ |
| AI disabled fallback | ✓ | ✓ | ✓ | ✓ |

Use `example.com` / allowlisted mailboxes only.
