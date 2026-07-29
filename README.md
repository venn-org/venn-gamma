# Venn

Flatmate and room discovery. Users sign up as either **seeking** (looking for a
place) or **owner** (has a place), build a profile, set preferences, and match
when interest is mutual — then chat in-app.

Expo (React Native) targeting iOS, Android and web from one codebase, with
Supabase for auth, Postgres and storage.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the two values the app bundle needs:

| Variable                        | Where it comes from                                           |
| ------------------------------- | ------------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | Supabase dashboard → Project Settings → API                   |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | same page (the _anon/public_ key, never the service_role key) |

The remaining entries in `.env.example` are optional: the two
`SUPABASE_AUTH_EXTERNAL_GOOGLE_*` values are read by `supabase/config.toml` for
local `supabase start` only (the hosted project holds its own in the
dashboard), and `EXPO_PUBLIC_VAPID_PUBLIC_KEY` is for web push.

## Running

```bash
npm start
```

Then pick a target from the Expo CLI, or go straight to one:

```bash
npm run web
```

`npm run android` / `npm run ios` are the native equivalents.

## Database

Schema lives in `supabase/migrations/`, applied in filename order:

```bash
supabase db push
```

`supabase/schema.sql` is a non-authoritative reference dump of the full schema —
useful for reading, never applied. Migrations are the source of truth.

Two things worth knowing before you touch the schema:

- **`profiles` is a view**, not a table. It joins `profile_core`,
  `profile_lifestyle` and `profile_preferences`, and carries `INSTEAD OF`
  triggers that fan writes back out across the three. The client only ever
  reads and writes `profiles`.
- **`likes`, `matches` and `blocks` are also views**, over history-preserving
  `*_log` tables. A "delete" through them soft-revokes rather than erasing, so
  records survive for trust & safety review. Realtime subscriptions must target
  the underlying `*_log` table — logical replication never fires on a view.

If `db push` offers to run migrations you already applied by hand, reconcile the
history instead of re-running them:

```bash
supabase migration list
```

then `supabase migration repair --status applied <version>` for each one that is
genuinely already present.

## Checks

```bash
npm run verify
```

Lint, typecheck, tests and a scan for server-only secrets in client code — the
same four things CI runs on every PR. Individually: `npm run lint`,
`npm run typecheck`, `npm test`, `npm run check:secrets`.

Jest with `jest-expo`. Coverage is the pure logic in `lib/`, `services/` and
`config/` (enum mapping, preference matching, photo arrays, profile completion,
local-day boundaries, filter-string safety, image transforms) — the screens have
no tests yet.

## Layout

```
app/            expo-router routes; directory name = URL segment
  (auth)/       login, email + OTP entry
  (onboarding)/ the 9-step signup flow
  (tabs)/       feed, standouts, likes, messages, profile
  (settings)/   edit profile, legal, help, safety
components/     shared UI (components/chat/ for feature-local pieces)
config/         env validation, feature flags, tunable limits
hooks/          useOnboarding — cross-screen onboarding draft state
lib/            pure domain logic, auth, theme, platform helpers
services/       ALL Supabase access — screens never query directly
supabase/       migrations + reference schema dump
docs/           CONTRIBUTING + architecture decision records
```

Two conventions worth knowing before you write code — both explained in
[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md):

- **Screens don't query the database.** Everything goes through `services/`,
  and an ESLint rule enforces it. See [ADR 0003](docs/adr/0003-services-layer.md).
- **Anything a user can bypass isn't a rule.** Daily limits, block filtering and
  match filtering are enforced in Postgres; the client copies are for display.
  See [ADR 0002](docs/adr/0002-server-side-daily-like-limit.md).

## Builds

`app.json` is the static Expo config; `app.config.js` layers on per-environment
identity, `runtimeVersion` and `extra`. Pick an environment with
`APP_ENV=preview|production`, or via the matching `eas.json` build profile:

```bash
eas build --profile preview --platform android
```
