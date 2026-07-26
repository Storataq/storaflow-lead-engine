# Lead Engine (Storaflow)

Interne webapp om publieke zakelijke bedrijfs- en contactgegevens te verzamelen op basis van branche, zoekterm, plaats, regio en land.

Branding in code blijft voorlopig generiek (`Lead Engine`). De productlijn richting commerciële SaaS heet **Storaflow**.

## Huidige status (pilot-ready)

De pilot dekt de volledige **mock lead-flow** end-to-end:

1. Organisatie + login (Supabase Auth)
2. Zoekopdrachten aanmaken/bewerken
3. Mock scrape starten vanuit een zoekopdracht
4. Job queue + jobdetail met voortgang, logs en resultaten
5. Connector Management (mock + Google Maps MVP mock)
6. Bedrijven en contactsignalen bekijken
7. Dashboard met actuele tellingen

**Nog niet live:** echte Google Maps scraping, Places API, browser automation, proxies, CAPTCHA, LinkedIn, AI enrichment, CSV-export UI, uitsluitlijst-handhaving.

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
3. latere migraties in dezelfde map (`…00003` t/m `…00007`)

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
  app/(app)/           # Authenticated routes (dashboard, zoekopdrachten, jobs, …)
  components/          # UI, layout, feature managers
  lib/
    auth/              # Login / logout / org actions
    companies/         # Bedrijvenqueries
    contacts/          # Contactsignalen uit scrape_results
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
docs/                  # Documentatie
worker/                # Placeholder voor latere background worker
```

## Connectorarchitectuur

- Connectors implementeren een gedeelde interface (capabilities, health, mock search).
- Registry + factory kiezen de connectorcode (standaard `google_maps` voor jobs).
- Catalogus-UI (`/connectors`) toont manifests; live netwerk is uitgeschakeld.
- Alle huidige connectors draaien in **mock mode** — geen Places API, geen browser, geen proxies.

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

## Pipeline

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

## Toekomstige uitbreidingen (fase 11–20+)

- Echte Google Maps / Places (met strikte rate limits)
- Website crawler + contactextractie
- Proxies / CAPTCHA-beleid (alleen waar legaal en toegestaan)
- LinkedIn (alleen publieke signalen, later)
- AI enrichment
- Uitsluitlijst-handhaving + CSV/Excel export
- Aparte worker-claim loop
- SaaS: registratie, billing, teams, API

Zie [docs/roadmap.md](docs/roadmap.md).
