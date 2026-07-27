# Automated Email Engine

Related: [CAMPAIGN-MANAGER.md](./CAMPAIGN-MANAGER.md), [SEQUENCE-ENGINE.md](./SEQUENCE-ENGINE.md),
[EMAIL-PRODUCTION-READINESS.md](./EMAIL-PRODUCTION-READINESS.md), [EMAIL-OPERATIONS.md](./EMAIL-OPERATIONS.md),
[EMAIL-AI-ARCHITECTURE.md](./EMAIL-AI-ARCHITECTURE.md), [ARCHITECTURE.md](./architecture.md), [ROADMAP.md](./roadmap.md).

## Status

**Phase 21L — Production Hardening** (builds on 21A–21K).

The engine is **Ready for Controlled Test Mode / Limited Pilot** after manual migration `00022`, env configuration, and allowlisted testing. It is **not** automatically Production Ready.

## Goal

```
… → Preferences (21I) → Analytics (21J) → AI (21K) → Hardening / Ops (21L)
```

## Modules

| Module | Status |
|---|---|
| … through AI Intelligence | 21A–21K |
| Production hardening / ops | 21L |

## Database (manual)

21. `20260726000021_email_ai_intelligence.sql`  
22. `20260726000022_email_production_hardening.sql`

## Key ops routes

| Route | Purpose |
|---|---|
| `/email/operations` | Health, kill switches, test allowlist, reconciliation, E2E |
| `/api/internal/health*` | Secret-protected health |
| `/api/internal/email/execution/*` | Scheduler/worker |

## Defaults (pilot-safe)

- Provider dispatch **off**
- Test mode **on**
- AI automatic actions **off**
- Emergency stop available
