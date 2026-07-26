# Lead Engine

Interne webapp om publieke zakelijke bedrijfs- en contactgegevens te verzamelen op basis van branche, zoekterm, plaats, regio en land.

Dit project is de technische basis voor een latere commerciële uitbreiding. Branding in code blijft voorlopig generiek (`Lead Engine`).

## Status

**Fase 1 (huidig):** authenticatie, organizations, database + RLS, app-shell, lege pagina’s.

**Nog niet gebouwd:** scraper, worker-verwerking, CSV-export, zoekformulieren, deduplicatie-UI.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth, PostgreSQL, RLS)
- Zod + React Hook Form (klaar voor latere formulieren)
- Aparte worker (volgende fase)

## Repository-analyse (fase 1 start)

De repository was leeg (geen `package.json`, geen git-historie met appcode). Daarom is het Next.js-project vanaf scratch opgezet.

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

Voer migraties **niet** automatisch vanuit de app uit. Doe dit handmatig:

1. Open Supabase Dashboard → SQL Editor
2. Voer uit in volgorde:
   - `supabase/migrations/20260726000001_initial_schema.sql`
   - `supabase/migrations/20260726000002_rls_policies.sql`

Of via CLI (optioneel):

```bash
npx supabase db push
```

Zie ook [docs/database.md](docs/database.md).

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

Worker-startinstructies volgen in de scraperfase (`npm run worker` is gereserveerd).

## Mappenstructuur (kern)

```
src/
  app/                 # Routes (App Router)
  components/          # UI + layout
  lib/
    auth/              # Server actions (login/logout/org)
    organizations/     # Actieve organisatie (server-side)
    supabase/          # Clients (browser/server/admin)
    scraping/          # Interfaces (nog geen implementatie)
  types/               # Database/types
supabase/migrations/   # SQL migraties
docs/                  # Documentatie
worker/                # Placeholder voor background worker
```

## Privacy & veiligheid

- Alleen publiek toegankelijke zakelijke informatie
- Geen CAPTCHA-/login-omzeiling
- Geen scraping van private IP’s / localhost / non-HTTP(S)
- RLS op alle organisatiegebonden tabellen
- Service role alleen op server/worker
- Respecteer robots.txt, rate limits, blocklists en verwijderverzoeken (scraperfase)

## Roadmap naar Storaflow

1. Zoekopdrachten + scrape jobs + worker
2. Website crawler + contactextractie
3. Normalisatie, deduplicatie, uitsluitlijst
4. Exports (CSV/Excel)
5. SaaS: registratie, billing, teams, API (later)

Zie [docs/roadmap.md](docs/roadmap.md).
