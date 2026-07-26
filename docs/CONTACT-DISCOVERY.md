# Contact Discovery & Website Enrichment (Phase 20C)

Related: [ARCHITECTURE.md](./architecture.md), [ROADMAP.md](./roadmap.md),
[future-integrations.md](./future-integrations.md).

## Purpose

For companies with a public website, Storaflow can:

1. Normalize and SSRF-check the URL
2. Check availability (bounded HTTP fetch)
3. Respect robots.txt where loadable
4. Discover high-value internal pages (contact / about / team / …)
5. Extract public emails, phones, social links, and possible people
6. Validate email **syntax** and optionally check **MX**
7. Score confidence, dedupe, and persist company contacts
8. Update company fields carefully (never overwrite stronger data blindly)
9. Show job progress, results, and an enrichment dashboard

**This phase does not send email, run campaigns, or activate the sales funnel.**

## Compliance

> Users remain responsible for complying with applicable privacy, marketing and anti-spam regulations.

- Syntax validation ≠ mailbox deliverability
- MX validation ≠ consent for outreach
- Only publicly accessible business information is processed
- No auth bypass, CAPTCHA bypass, paywall bypass, or private network access

## Architecture

```
Company.website_url
        │
        ▼
createWebsiteEnrichmentJob (scrape_jobs.job_type = website_crawl)
        │
        ▼
executeWebsiteEnrichmentJob  (same queue / advanceMockScrapeAction path)
        │
        ▼
runWebsiteEnrichment
  ├─ normalizeWebsiteUrl + SSRF guards
  ├─ fetch homepage (size/timeout limits)
  ├─ robots.txt policy
  ├─ rank + crawl limited same-domain pages
  ├─ extract emails / phones / social / people
  ├─ syntax + MX (best-effort) + confidence
  └─ dedupe in-memory
        │
        ▼
persistEnrichmentResult → contacts + companies + company_sources snapshot
        │
        ▼
CRM activity timeline + job logs
```

Code roots:

| Path | Role |
|---|---|
| `src/lib/enrichment/website-crawler/` | URL safety, normalize, fetch, robots, classify, HTML extract |
| `src/lib/enrichment/email-validation/` | Normalize, syntax, category, confidence, MX |
| `src/lib/enrichment/contact-discovery/` | Phones, people |
| `src/lib/enrichment/providers/` | Future verification / browser interfaces (no vendors) |
| `src/lib/enrichment/jobs.ts` | Job create/execute on `scrape_jobs` |
| `src/lib/enrichment/persist.ts` | Contacts + company updates + evidence snapshot |
| `src/app/(app)/enrichment` | Enrichment dashboard + bulk |
| `src/app/(app)/companies/[id]/enrichment` | Results UI |

## Crawl limits (defaults)

- Max pages: 12
- Depth: 2 (homepage + ranked links)
- Same domain only
- HTML / text responses
- Max ~2 MB / page
- Request timeout 15s, total job timeout 90s
- Delay ~750ms between page fetches
- User-Agent: Storaflow crawler string via fetch helpers

## Email validation levels

| Level | Meaning |
|---|---|
| Syntax | Local/domain shape, placeholders, role detection |
| Domain / MX | DNS lookup when runtime allows |
| Mailbox | **Always** `not_checked` in this phase |
| Confidence | 0–100 with high/medium/low/invalid |

Provider interface `EmailVerificationProvider` is prepared; default is `NotCheckedEmailVerificationProvider`.

## Review rules (conservative)

- High-confidence same-domain public email → auto_accepted into contacts table as company contact point
- Role inboxes (`info@`, `sales@`, …) stay **general company contact points**, not named persons
- Low-confidence people extractions stay Needs Review in the results snapshot
- Conflicting company address overwrite is not performed (address discovery is stubbed)

## Database

**No new migration for Phase 20C.** Reuses:

- `scrape_jobs` with `job_type = website_crawl`
- `scrape_job_logs`
- `company_sources.metadata_json` enrichment snapshots
- `contacts`
- `companies` soft field updates
- CRM activity events

## Qualification / Opportunity integration

- Discovered emails/phones land in `contacts` and may soft-fill company phone/socials
- When leads already carry email/phone/website, existing qualification & opportunity engines score contactability as before
- `deriveEnrichmentContactability()` exposes enrichment hints without duplicating score logic
- Opportunity readiness checklist includes a website contact-discovery signal item

## UI

- Company detail → Website Enrichment panel (start / view results)
- `/companies/[id]/enrichment` → emails, phones, socials, people, pages, CRM contacts
- `/enrichment` → metrics, recent jobs, controlled bulk (max 10, skip last 24h)
- Jobs detail remains the log/progress surface for crawl stages

## Security

- Scheme allowlist (`http`/`https` only)
- Block localhost, private IPv4/IPv6, link-local, metadata hosts
- Redirect/follow with max redirects + re-check host safety in fetch layer
- Response size and timeout caps
- Organization isolation via existing RLS + server-side org resolution
- No unsanitized HTML rendering in the app

## Known limitations

- JavaScript-only sites are not fully readable (no Puppeteer/Playwright)
- CAPTCHA / bot walls are not bypassed
- Mailbox deliverability is unknown
- Page structure variance → people/titles may need manual review
- robots.txt load failures continue under safe policy and are logged
- Social profile **links** only — platforms are not scraped
- Address conflict workflow is minimal in this phase

## Recommended tests (no new framework)

If/when a test runner is added, prioritize:

1. URL normalization + SSRF blocks
2. Email normalize / syntax / role / confidence
3. Phone normalize
4. Page classification multilingual hints
5. Duplicate email/phone maps
6. Crawl limit enforcement

## Phase 20D integration points

- Use accepted high-confidence contacts as funnel prerequisites
- Still require explicit user action before outreach lists
- Wire mailbox verification providers only when configured
- Do not auto-send email from enrichment completion
