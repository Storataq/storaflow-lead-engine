# Enterprise Security & Identity Platform (Phase 26E)

Production-oriented security layer for SMB, Enterprise, and White Label tenants. Extends Supabase Auth, org RBAC, API keys, and settings without replacing them.

## Authentication architecture

| Method | Status |
| --- | --- |
| Email + password | Live (`loginAction` + Supabase) |
| Passwordless / magic link / passkeys / OAuth | Policy flags + UI ready |
| SSO (SAML, OIDC, Google, Entra, Okta, Auth0, OneLogin) | Draft providers per org |
| LDAP / Active Directory | Future flags on policies |

Login/logout write `security_login_attempts`, `security_sessions`, `security_devices`, and `security_audit_events`.

## RBAC

Built-in org roles: `owner`, `admin`, `member`, `viewer` (enum extended in migration `00038`).

- Existing RLS helpers `is_org_owner_or_admin` unchanged (owner/admin only)
- Granular matrix in `permissions.ts` (`hasSecurityPermission`)
- Custom roles + templates in `security_custom_roles`
- Permission preview in Security → Roles UI

Resources: companies, contacts, deals, tasks, campaigns, analytics, reports, copilot, marketplace, API, white label, billing, settings, users, organization, security.

## MFA

- Authenticator (TOTP secret stored encrypted field — rotate/KMS later)
- Recovery codes (hashed)
- Email backup + SMS ready flags
- Org `force_mfa` policy
- Admin reset MFA / disable self-service

## Session & device management

App-level session overlay (does not replace Supabase Auth cookies): browser, OS, device, IP, country ready, login/last activity, terminate one / terminate others.

Devices: fingerprint, trust, revoke, new-device alerts.

## Access policies

Per org: session/idle timeout, max sessions, password rules, failed-login threshold, lockout, allowed IPs, login method flags, country/hours JSON (future enforcement).

## Audit coverage

`security_audit_events`: login, logout, failed login, MFA enable/disable, role/permission changes, session/device revoke, account lock/unlock, SSO config, security settings. Complementary to `activity_events` / collaboration / platform API audits.

## Security dashboard

`/security` widgets: recent/failed logins, sessions, devices, MFA adoption, alerts, permission changes, audit volume.

## API security

Added scopes `security:read`, `security:write`, `users:write`. Existing key rotation, expiration, rate limits remain in platform-api.

## Compliance preparation

`security_data_processing_logs` for GDPR/SOC2/ISO processing records; consent tracking ready via metadata.

## Data protection

Org isolation via RLS, least privilege roles, server actions with admin gates, httpOnly org cookie, secure cookies in production. CSRF/XSS/headers: Next.js defaults + existing middleware session refresh.

## Extension points

1. Enforce MFA challenge in login flow (TOTP verify step)
2. Full CIDR + geo IP + impossible travel engine
3. Live SAML/OIDC handshake + SCIM
4. Passkey WebAuthn
5. Push/email security alert delivery
6. Hardware KMS for MFA secrets
7. Signed request HMAC for API
8. Security headers middleware hardening pack

## Migration

`supabase/migrations/20260726000038_enterprise_security_identity.sql` — run manually after `00037`.

## Tests

```bash
node --experimental-strip-types --test src/lib/security/security.test.ts
```
