# Email Production Readiness (Phase 21L)

Related: [EMAIL-SECURITY.md](./EMAIL-SECURITY.md), [EMAIL-OPERATIONS.md](./EMAIL-OPERATIONS.md),
[EMAIL-DEPLOYMENT-CHECKLIST.md](./EMAIL-DEPLOYMENT-CHECKLIST.md), [AUTOMATED-EMAIL-ENGINE.md](./AUTOMATED-EMAIL-ENGINE.md).

## Overall status (evidence-based)

**Ready for Controlled Test Mode / Limited Pilot** — **not** automatically “Production Ready”.

Lint and build passing are necessary but not sufficient.

### Critical blockers for live production sending

1. Apply migration `20260726000022_email_production_hardening.sql` manually
2. Configure Resend API key, webhook secret, verified domain/DNS
3. Set `EMAIL_PROVIDER_DISPATCH_ENABLED=true` only after allowlisted test success
4. Set org `provider_dispatch_enabled` via `/email/operations`
5. Disable test mode / configure allowlist deliberately
6. Confirm organization postal address / legal URLs for footers
7. Schedule scheduler + worker with `EMAIL_EXECUTION_INTERNAL_SECRET`
8. Rehearse emergency stop and unsubscribe on a test address

### Critical fixes included in 21L

| Issue | Fix |
|---|---|
| Middleware redirected public email/webhook routes to login | Public allowlist in `src/lib/supabase/middleware.ts` |
| Worker route hardcoded `simulation: true` but worker ignored it and could send | Simulation respected; live requires env + org gate + `live=true` |
| Tracking IP hash used weak default secret | Fail closed without `EMAIL_TRACKING_SECRET` |
| Internal secret compare not timing-safe | `timingSafeStringEqual` |
| Click endpoint could redirect unsafe schemes | `isSafeHttpUrl` gate |
| Webhook persist failure returned 200 | Now 500 for retry |

## Checklist categories

Database · Auth · AuthZ · Org isolation · RLS · Queue · Scheduler · Worker · Provider · Webhooks · Tracking · Replies · Suppression · Preferences · Compliance · Analytics · AI · Privacy · Logging · Monitoring · Alerting · Backups · Recovery · Testing · Performance · Deployment · Documentation · Operations

Statuses: Not Checked / Pass / Pass with Warning / Fail / N/A / Deferred

Store rows optionally in `email_production_readiness_checks` after migration.

## Recommended pilot launch order

1. Local test mode (dispatch off)
2. Preview deploy + health endpoints
3. Allowlisted live send to example.com / owner mailbox
4. Verify delivery webhook, open/click, unsubscribe, suppression
5. Limited pilot daily/hourly caps
6. Increase limits only after ops review

## Honest limitations

- External alert channels are placeholders
- Rate limits for public endpoints are in-memory (single instance)
- Load tests documented, not auto-run
- Legal/GDPR compliance still requires org + counsel review
- Backups depend on Supabase plan
- Disaster recovery needs rehearsal
- Open tracking remains imperfect; AI still requires human review
