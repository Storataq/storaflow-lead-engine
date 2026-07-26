# Lead Engine (Storaflow)

Interne webapp om publieke zakelijke bedrijfs- en contactgegevens te verzamelen op basis van branche, zoekterm, plaats, regio en land — en die leads te beheren in een volledig CRM.

Branding in code blijft voorlopig generiek (`Lead Engine`). De productlijn richting commerciële SaaS heet **Storaflow**.

## Huidige status — Foundation + Live scrape + Contact discovery

Phase 20A foundation, **20B live scraper** (OpenStreetMap Nominatim), and **20C website contact discovery** are in tree:

1. Organisatie + login (Supabase Auth)
2. Zoekopdrachten → scrape jobs (mock + live OSM)
3. Bedrijven / contactsignalen
4. Website enrichment: crawl publieke pages → e-mail/telefoon/social discovery
5. Funnel activation: lead → qualification → pipeline (≤ outreach-ready) → campaign ready
6. CRM: leads, pipeline, deals, tasks, notes, funnels
7. Qualification, Opportunity Insights, Executive Dashboard

**Nog niet:** Places API / Google live, browser automation, CAPTCHA bypass, mailbox probing, outbound e-mail, campagnes.

Contact discovery: [docs/CONTACT-DISCOVERY.md](docs/CONTACT-DISCOVERY.md)  
Funnel activation: [docs/FUNNEL-ACTIVATION.md](docs/FUNNEL-ACTIVATION.md)

Release notes: [docs/RELEASE-v0.1-FOUNDATION.md](docs/RELEASE-v0.1-FOUNDATION.md)

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth, PostgreSQL, RLS)
- Zod + React Hook Form / server actions
- Connector framework onder `src/lib/scraping/connectors/`

## Lokale installatie

```bash
npm install
cp .env.example .env.local
```

Vul de waarden in `.env.local` in (zie hieronder).

```bash
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

## Environment variables

| Variable | Waar | Beschrijving |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client + server | Publieke publishable key (RLS van toepassing) |
| `SUPABASE_SERVICE_ROLE_KEY` | Alleen server/worker | Service role — **nooit** in clientcode |
| `NEXT_PUBLIC_APP_URL` | App | Basis-URL, bijv. `http://localhost:3000` |

## Supabase migraties (handmatig)

Voer migraties **niet** automatisch vanuit de app uit. Doe dit handmatig in volgorde via Supabase SQL Editor of CLI:

1. `supabase/migrations/20260726000001_initial_schema.sql`
2. `supabase/migrations/20260726000002_rls_policies.sql`
3. latere migraties in dezelfde map (`…00003` t/m recentste)

```bash
npx supabase db push
```

Zie [docs/database.md](docs/database.md).

## Auth (intern)

- Geen publieke registratie in de UI
- Maak gebruikers aan via Supabase Auth (Dashboard → Authentication → Users)
- Na eerste login: organisatie aanmaken
- `organization_id` wordt altijd server-side afgeleid uit lidmaatschap

## Scripts

```bash
npm run dev      # Next.js development
npm run build    # Productiebuild
npm run lint     # ESLint
npm run start    # Productieserver
```

## Projectstructuur

```
src/
  app/(app)/           # Authenticated routes (+ loading/error)
  components/
    layout/            # PageHeader, EmptyState, PageSkeleton, RouteLoading, PageErrorState
    crm/               # CRM UI (leads, pipeline, dashboards, …)
  lib/
    auth/              # Login / logout / org actions
    companies/         # Bedrijvenqueries
    contacts/          # Contactsignalen uit scrape_results
    crm/               # CRM + qualification / opportunities / executive analytics
    international/     # Landen, talen, bronnen, branches
    jobs/              # Queue, executor, persist, actions
    organizations/     # Actieve organisatie (server-side)
    scraping/
      connectors/      # Connector framework + mock + google_maps MVP
      registry/        # Catalogus voor Connector Management UI
    searches/          # Zoekopdracht CRUD + preview
    ui/                # Gedeelde UI helpers (user-facing errors)
  types/               # Database / Supabase types
supabase/migrations/   # SQL migraties
docs/                  # Architectuur, DB, roadmap, release notes
worker/                # Placeholder voor latere background worker
```

## Module guide (kort)

| Module | Route / locatie | Notitie |
|---|---|---|
| Search | `/zoekopdrachten` | Criteria → mock scrape jobs |
| Jobs | `/jobs` | Queue, logs, resultaten |
| Companies | `/companies` | Persistente scrape-output |
| CRM | `/crm/*` | Leads, pipeline, deals, tasks, notes |
| Qualification | `/crm/qualification` | Deterministische lead scores |
| Opportunities | `/crm/opportunities` | Opportunity + next-best-action |
| Executive | `/crm/executive` | Funnel / pipeline / revenue analytics |
| Connectors | `/connectors` | Manifests; live netwerk uit |

Uitgebreid: [docs/architecture.md](docs/architecture.md)

## UI conventions

- **Loading:** route `loading.tsx` → `RouteLoading` / `PageSkeleton`
- **Empty:** `EmptyState` met icon, titel, beschrijving, primaire (+ optionele secundaire) actie
- **Errors:** `toUserFacingError` + `Alert` of `PageErrorState` (retry + terug)
- **CRM nav:** sidebar children + `CrmSubnav`

## Connectorarchitectuur

- Connectors implementeren een gedeelde interface (capabilities, health, mock search).
- Registry + factory kiezen de connectorcode (standaard `google_maps` voor jobs).
- Catalogus-UI (`/connectors`) toont manifests; live netwerk is uitgeschakeld.
- Alle huidige connectors draaien in **mock mode** — geen Places API, geen browser, geen proxies.

Zie [docs/future-integrations.md](docs/future-integrations.md) voor uitbreidingspunten.

## Jobflow

```
Zoekopdracht → startScrapeAction → scrape_jobs (queued)
  → client poll advanceMockScrapeAction
  → MockJobExecutor + ConnectorFactory
  → pipeline (normalize / dedupe)
  → persistPipelineResults → companies + scrape_results + logs
  → completed
```

Statuses: `draft` → `pending`/`queued` → `active`/`running` → `completed` | `failed` | `paused` | `cancelled`.

## Pipeline (scrape)

1. Connector levert mock business results
2. Normalisatie van naam/domein/locatie
3. Deduplicatie (sourceId, domain, name+city+country)
4. Persist naar `companies`, `company_sources`, `scrape_results`
5. Contactsignalen (e-mail/telefoon) blijven in `raw_payload` tot een latere contacts-fase

## Privacy & veiligheid

- Alleen publiek toegankelijke zakelijke informatie
- Geen CAPTCHA-/login-omzeiling
- Geen scraping van private IP’s / localhost / non-HTTP(S)
- RLS op alle organisatiegebonden tabellen
- Service role alleen op server/worker
- Begrijpelijke foutteksten in de UI (geen ruwe SQL/providerfouten)

## Documentatie

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — canonical architecture (Phase 20A)
- [ROADMAP.md](docs/ROADMAP.md) — phases 20B–D and email engine
- [RELEASE-v0.1-FOUNDATION.md](docs/RELEASE-v0.1-FOUNDATION.md) — foundation release notes
- [architecture.md](docs/architecture.md) — short architecture summary
- [Database](docs/database.md)
- [Supabase](docs/supabase.md)
- [Future integrations](docs/future-integrations.md)

## Toekomst (na v0.1)

- Echte Google Maps / Places / Search connectors
- Website crawler + contactextractie
- E-mail find/validate + campagnes (expliciete send)
- Background worker claim-loop
- AI adapters voor summaries (server-only)
- SaaS: registratie, billing, teams, API, webhooks
