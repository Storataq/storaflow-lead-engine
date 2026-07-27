# Multi-Tenant Administration Platform (Phase 26G)

Staff-only console for managing all Storaflow tenants. **Never** shown in customer organization navigation.

## Architecture

```
/platform-admin/*   ← separate (platform) route group + layout
  requirePlatformAdmin()  → platform_admins row OR PLATFORM_ADMIN_EMAILS allowlist
  platformServiceClient() → createServiceClient() AFTER gate
  platform_audit_events   → every mutating action
```

Platform permissions (`platform_owner` / `platform_admin` / `platform_support` / `platform_readonly`) are **orthogonal** to organization roles (`owner`/`admin`/`member`/`viewer`). Staff never inherit customer RBAC via this matrix.

## Tenant isolation

- Customer RLS remains membership-scoped; customers cannot read other orgs.
- Cross-tenant lists use the **service role only after** `requirePlatformAdmin()`.
- Soft lifecycle on `organizations`: `active` | `suspended` | `archived` | `deleted`.
- Impersonation is audited, timed out, cookie-bound, banner-visible; default **read-only**.

## Platform RBAC

| Role | Highlights |
|------|------------|
| platform_owner / platform_admin | Full manage + elevated impersonation |
| platform_support | View + read-only impersonation |
| platform_readonly | View only |

Permissions live in `src/lib/platform-admin/permissions.ts`.

## Impersonation

1. Reason required  
2. Mode: `read_only` (default) or `elevated_support`  
3. Auto timeout (default 30m)  
4. Cookie `storaflow_platform_impersonation_id`  
5. Visible banner + end action  
6. Full `platform_audit_events` trail  

## Feature flags

`platform_feature_flags` + `platform_feature_flag_overrides` — global / org / beta / experimental / early access + emergency disable.

## Monitoring

Dashboard aggregates org counts, trials, MRR/ARR scaffold, API/webhook usage, and health probes (DB/API/AI/email env presence).

## Access

1. Insert into `platform_admins`, **or**  
2. Set `PLATFORM_ADMIN_EMAILS=you@storaflow.com`  

Portal: `/platform-admin` — redirected to `/dashboard` if not staff. Link appears in the user menu **only** for platform admins.

## Migration

`supabase/migrations/20260726000040_multi_tenant_administration.sql` — manual, after `00039`.

## Future extension points

- Live backup/restore workers (`platform_backup_jobs`)
- Tenant export/import pipelines
- Disaster recovery runbooks
- Real-time queue/storage health agents
- Forced logout via auth admin API
- Full session kill-switch across devices
