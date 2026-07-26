# Supabase setup

1. Maak een Supabase-project.
2. Open **Project Settings → API Keys** (of **Settings → API**).
3. Kopieer naar `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (of legacy **anon** / **public**) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Service role key** (secret) → `SUPABASE_SERVICE_ROLE_KEY` (alleen server/worker)
4. Controleer de verbinding:

```bash
npm run check:supabase
```

5. Voer migraties handmatig uit (zie `docs/database.md`).
6. Zet Auth → Providers: Email aan.
7. Zet “Confirm email” naar wens (intern: vaak uit voor snelle onboarding).
8. Maak de eerste gebruiker via Authentication → Users (geen publieke signup-UI).
9. Start de app, log in, maak een organisatie aan.

## Belangrijk

- Gebruik **nooit** `SUPABASE_SERVICE_ROLE_KEY` in clientcode of als `NEXT_PUBLIC_*`.
- Browser/server request-path gebruikt alleen de publishable key.
- Service role is voor worker/admin-taken achter de server.
