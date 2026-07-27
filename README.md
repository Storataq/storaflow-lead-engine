# Storaflow

**Storaflow** is an AI lead engine with CRM, email automation, and company intelligence.

Collect public business company and contact data by industry, search term, city, region and country — then manage outreach through CRM funnels, campaigns and sequences.

## Product pillars

| Pillar | What it covers |
|--------|----------------|
| **AI Lead Engine** | Search → scrape → companies/contacts → enrichment → classification |
| **CRM** | Leads, pipelines, funnels, deals, tasks, notes, qualification, opportunities |
| **Email Automation** | Templates, sequences, campaigns, execution, preferences, analytics |
| **Company Intelligence** | Categories, enrichment, campaign readiness, category actions |

## Current status

Phase 20–23 foundation is in tree:

1. Organization + login (Supabase Auth)
2. Zoekopdrachten → scrape jobs (mock + live OSM)
3. Bedrijven / contactsignalen
4. Website enrichment
5. Funnel activation → campaign ready
6. Email Engine (templates → campaigns → sequences → Resend → analytics → optional AI)
7. CRM + qualification + opportunity insights + executive dashboard
8. Company categories, AI classification, category actions

**Still required for broad production sending:** Resend/DNS/worker scheduling per environment, legal review, rehearsed DR. Target after hardening: **controlled test mode / limited pilot**.

Docs:

- Email ops: [docs/EMAIL-OPERATIONS.md](docs/EMAIL-OPERATIONS.md)
- Readiness: [docs/EMAIL-PRODUCTION-READINESS.md](docs/EMAIL-PRODUCTION-READINESS.md)
- Email engine: [docs/AUTOMATED-EMAIL-ENGINE.md](docs/AUTOMATED-EMAIL-ENGINE.md)
- Campaign manager: [docs/CAMPAIGN-MANAGER.md](docs/CAMPAIGN-MANAGER.md)
- Company categories: [docs/company-categories.md](docs/company-categories.md)
- Classification: [docs/company-classification.md](docs/company-classification.md)
- Category actions: [docs/category-actions.md](docs/category-actions.md)
- Release notes: [docs/RELEASE-v0.1-FOUNDATION.md](docs/RELEASE-v0.1-FOUNDATION.md)

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth, PostgreSQL, RLS)
- Zod + React Hook Form / server actions
- Connector framework under `src/lib/scraping/connectors/`

## Local setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local`, then:

```bash
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

## Environment variables

| Variable | Where | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client + server | Public publishable key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/worker only | Service role — **never** in client code |
| `NEXT_PUBLIC_APP_URL` | App | Base URL, e.g. `http://localhost:3000` |

## Supabase migrations (manual)

Do **not** auto-run migrations from the app. Apply manually in order via Supabase SQL Editor or CLI:

1. `supabase/migrations/20260726000001_initial_schema.sql`
2. `supabase/migrations/20260726000002_rls_policies.sql`
3. Later migrations in the same folder (`…00003` through latest)

```bash
npx supabase db push
```

See [docs/database.md](docs/database.md).

## Auth

- No public registration in the UI
- Create users via Supabase Auth (Dashboard → Authentication → Users)
- After first login: create an organization
- `organization_id` is always derived server-side from membership

## Branding

User-facing product name is **Storaflow** (`APP_NAME` in `src/lib/constants.ts`).  
Repository / package name may still say `storataq-lead-engine` for historical stability — that is intentional and not part of the product UI.

Logo / PWA icon artwork: placeholder “S” mark until final brand assets land (`src/components/brand/brand-mark.tsx`, `public/icons/icon.svg`).

## License / copyright

© Storaflow — internal product. See application settings for version and environment.
