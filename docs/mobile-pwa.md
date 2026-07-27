# Mobile Experience & Progressive Web App (Phase 26H)

Single-codebase installable Storaflow experience for Android, iOS/iPadOS, desktop, and Chromebooks.

## PWA architecture

```
manifest.webmanifest  ← src/app/manifest.ts (icons, shortcuts, standalone)
public/sw.js          ← shell + runtime caches, push, background sync tag
PwaProvider           ← SW register, install prompt, offline banner, updates
IndexedDB outbox      ← offline-queue.ts → POST /api/pwa/sync
pwa_* tables          ← push subscriptions + server sync log (migration 00041)
```

## Offline strategy

| Layer | Behavior |
|-------|----------|
| Service worker | Network-first navigations; cache fallback; `/offline` last resort |
| Static assets | Cache-first for `/_next/static` and `/icons` |
| IndexedDB outbox | Queue companies/contacts/tasks/notes/activities/comments/AI requests |
| Server sync | `pwa_offline_sync_queue` with pending/conflict statuses |
| Background Sync | `sync` event tag `storaflow-offline-sync` posts FLUSH to clients |

Cached browsing focuses on previously visited dashboard, companies, contacts, CRM tasks/notes/reports.

## Mobile optimization

- Bottom navigation (`lg:hidden`) with large touch targets + safe-area padding
- Compact KPI cards on dashboard (2-column on phones)
- Copilot FAB lifted above bottom nav on mobile
- `MobileTableShell` / `MobileCardList` helpers for dense tables
- Native share / copy-link (`ShareButton`)
- Settings → Mobile & PWA for install, queue, push, device probes

## Push notifications (prepared)

Types: task reminder, campaign finished, automation failed, lead alert, deal won/lost, mention, security, billing.  
Wire with `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` and `subscribePushScaffold()`.

## Device extension points

Camera (document / card / QR / barcode), mic, location, biometric (WebAuthn), file picker — capability detection in `device.ts`. Permissions-Policy allows `self` for camera/mic/geo.

## Security

- No raw secrets in SW
- Sync API requires authenticated org membership
- Push keys stored as provider tokens (`p256dh`/`auth`), not payment data
- Offline queue org-scoped via RLS

## Migration

`supabase/migrations/20260726000041_mobile_pwa_experience.sql` — **manual**, after `00040`.

## Lighthouse PWA readiness (expected after deploy over HTTPS)

- Installable: manifest + 192/512 icons + SW + HTTPS
- Offline: `/offline` + cached shell
- Theme color / viewport configured
- Run Lighthouse PWA audit on production URL (local `next start` + HTTPS tunnel recommended)

## Future extension points

- Full Workbox precache of critical routes
- Conflict UI for sync collisions
- Splash screens per device
- Live Web Push sender worker
- Voice input for search / copilot
- Biometric re-auth gate for sensitive offline data
