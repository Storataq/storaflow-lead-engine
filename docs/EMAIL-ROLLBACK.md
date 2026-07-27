# Email Rollback

Prefer forward fixes.

| Layer | Rollback |
|---|---|
| App | Redeploy previous build |
| Env | Revert flags; keep secrets rotated if compromised |
| Provider | Set `EMAIL_PROVIDER_DISPATCH_ENABLED=false` |
| Worker/scheduler | Disable env flags / stop cron |
| Migration 00022 | Do not drop tables casually; leave additive structures |

No automatic destructive down migration.
