# White Label Platform (Phase 26C)

Complete org-scoped rebranding for partners, agencies, and enterprises. Each organization owns isolated branding; settings never leak across tenants.

## Theme engine

- Module: `src/lib/white-label/theme-engine.ts`
- Maps brand colors → CSS custom properties (`--primary`, `--background`, `--foreground`, …)
- Typography: primary / heading / body fonts + font scale
- Modes: `system` | `light` | `dark` (auto via `resolveThemeModeClass`)
- Cached in `organization_white_label.theme_cache_json` on save
- Future variants registry: `FUTURE_THEME_VARIANTS` (seasonal, high contrast)

Injected in-app via `WhiteLabelThemeStyle` in `(app)/layout.tsx`.

## Brand architecture

| Concern | Storage |
| --- | --- |
| Full config | `organization_white_label.config_json` |
| Theme cache | `organization_white_label.theme_cache_json` |
| Logo assets | `organization_white_label_assets` (URL or data URL ≤512KB) |
| Custom domains | `organization_custom_domains` |
| Partners | `partner_accounts` / `partner_customers` |

Config sections: general text, logos, colors, typography, login, email, navigation, feature toggles, custom CSS/JS flags (stored, **not executed**).

On save, syncs `organizations.logo_url`, `support_email`, `terms_url`, `privacy_policy_url` when set.

## Organization isolation

- All tables RLS: `is_org_member` for read; `is_org_owner_or_admin` for write
- UI + server actions resolve org from membership only
- API `GET /api/v1/white-label` uses API-key org context + `settings:read`
- Public host lookup: `get_public_white_label_by_hostname` (security definer) only for verified domains

## Assets

- MIME: SVG, PNG, JPG, WEBP, ICO
- Max 512 KB (data-URL path); max dimension 4096px
- Favicon capped at 512px width when dimensions provided
- Lazy-loaded in `BrandMark` (`loading="lazy"`)
- Storage bucket upload can replace data URLs later without schema break

## Custom domains

Statuses: `pending_dns` → `dns_verified` → `ssl_pending` → `active` (also `disabled` / `failed`).

- TXT token: `storaflow-verify=…` (generated on add)
- SSL status column ready; provisioning not live
- Multiple hostnames per org; unique hostname globally
- Login branding resolves via verified hostname when present

## Feature toggles & navigation

Modules: CRM, Campaigns, Automation, Analytics, Marketplace, API, Reports, AI Copilot, Billing.

Disabled modules hide matching nav prefixes (`FEATURE_NAV_PREFIXES`). Custom menu items append to sidebar. Copilot shell respects `features.copilot`.

## Partner management

Scaffolding only: partner accounts with branding/stats/license JSON, plus customer org links. Full partner portal UI can extend `/settings/white-label` partner section.

## API

```http
GET /api/v1/white-label
Authorization: Bearer <api_key>
Scope: settings:read
```

Returns sanitized branding + domain list for the key’s organization. Custom JS body is never exposed; CSS body only when `customCssEnabled`.

## UI

- Settings hub → **White Label** → `/settings/white-label`
- Live preview: desktop / tablet / mobile / email
- RBAC: owners & admins edit; members view-only

## Future extension points

1. Execute / sandbox custom CSS (and never raw JS without CSP)
2. Supabase Storage bucket for large assets + CDN
3. Live SSL via ACME / Cloudflare for custom domains
4. Seasonal themes from `FUTURE_THEME_VARIANTS`
5. Partner portal pages + license enforcement
6. Subdomain wildcard routing (`*.partner.example`)
7. Email template engine consuming `email.logoUrl` / powered-by overrides everywhere
8. Public SDK methods wrapping `/api/v1/white-label`

## Migration

`supabase/migrations/20260726000036_white_label_platform.sql` — run manually after `00035`. Do not auto-execute from the app.

## Tests

```bash
node --experimental-strip-types --test src/lib/white-label/white-label.test.ts
```
