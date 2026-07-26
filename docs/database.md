# Supabase / PostgreSQL overzicht

## Migraties (handmatig uitvoeren)

Voer in deze volgorde uit in de Supabase SQL Editor:

1. `supabase/migrations/20260726000001_initial_schema.sql`
2. `supabase/migrations/20260726000002_rls_policies.sql`

De app voert migraties **niet** automatisch uit.

## Tabellen

| Tabel | Doel |
|---|---|
| `profiles` | Gebruikersprofiel gekoppeld aan `auth.users` |
| `organizations` | Multi-tenant organisatiestructuur |
| `organization_members` | Lidmaatschap + rol (`owner` / `admin`) |
| `organization_settings` | Scrapingdefaults per organisatie |
| `search_queries` | Zoekopdrachten |
| `scrape_jobs` | Background scrapingtaken (+ claimvelden) |
| `scrape_sources` | Modulaire bronconfiguratie |
| `companies` | Bedrijven / leads |
| `contacts` | Contactgegevens |
| `company_sources` | Herkomst per bedrijf |
| `exclusion_list` | Uitsluitingen |
| `scrape_errors` | Fouten per URL/job |
| `activity_events` | Activiteitenlog |
| `export_runs` | Exportmetadata |

## RLS-principe

- RLS aan op alle organisatiegebonden tabellen
- Toegang via `is_org_member(organization_id)` / `is_org_owner_or_admin(organization_id)`
- `organization_id` nooit uit onbetrouwbare clientinput overnemen; server bepaalt actieve org via lidmaatschap

## Auth-trigger

Bij nieuwe `auth.users` wordt automatisch een `profiles`-rij aangemaakt.
