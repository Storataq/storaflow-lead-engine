# Email Disaster Recovery

Depends on Supabase plan backups / PITR — verify in your project.

## Scenarios

| Scenario | Containment | Recovery |
|---|---|---|
| Bad deploy | Redeploy previous app revision | Keep DB; prefer forward fix |
| Failed migration 00022 | Do not re-run old migrations | Fix forward additive SQL |
| Provider key compromise | Emergency stop + rotate Resend key | Reconfigure webhook secret |
| Tracking secret compromise | Disable tracking; rotate secret | Accept broken old open tokens |
| Duplicate send | Emergency stop; suppress affected | Do not blind-retry accepted messages |
| Queue corruption | Pause worker/scheduler | Reconciliation dry run → authorized repair |

Do not automate destructive DB rollback after live data creation.
