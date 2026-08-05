# Contributing

See `docs/CICD.md` for how a change actually reaches production — git
workflow, EAS/OTA vs. native builds, database migration deploys, and
rollback procedures. See `docs/PERFORMANCE.md` for load-testing methodology
and the indexing findings behind `20260804000000_feed_scale_indexes.sql`.
This file covers day-to-day local development.

## Before you push

```bash
npm run verify
```

That runs lint, typecheck, tests and the secret scan — the same four things CI
runs. A pre-commit hook formats and lints staged files; a pre-push hook runs the
rest.

## Where code goes

```
app/          expo-router routes; directory name = URL segment
components/   shared UI (components/chat/ etc. for feature-local pieces)
services/     ALL Supabase access — see the rule below
lib/          pure domain logic and platform helpers
config/       env validation, feature flags, tunable limits
supabase/     migrations (source of truth) + reference schema dump
```

### Screens do not query the database

Every Supabase read and write lives in `services/`. An ESLint rule warns when a
file under `app/` or `components/` imports the client directly.

The reason is not tidiness: query logic spread across nine screens meant a
column rename was a grep through JSX, and it was how `select('*')` ended up on
the `profiles` view in five places — which is how exact GPS coordinates and
dates of birth were briefly readable by any signed-in user. What leaves the
database is now decided in one file, `services/columns.js`.

### Anything a user can bypass is not a rule

Daily like limits, block filtering and match filtering are enforced in the
database (RPCs and RLS). Client-side copies exist only so the UI can render a
number or open a sheet without a round-trip. If you find yourself writing a
check the client could simply skip, it belongs in a migration.

### Feature flags

Product switches go in `config/flags.js`, not as `const TEMP_...` at the top of
the screen that reads them. Same for tunable limits and poll intervals.

### Logging

Use `lib/log.js` (`debug` / `warn` / `error`), never `console.*` directly.
`debug` is dropped outside development, and `warn`/`error` route through a
single reporter that a crash service plugs into.

## Formatting backlog

The pre-existing ~12k lines have never been through Prettier, so
`npm run format:check` currently fails and is deliberately **not** gating CI.
lint-staged formats each file as it is touched. To clear the backlog, land

```bash
npm run format
```

as its own commit that changes nothing else, then add `format:check` back to
`.github/workflows/ci.yml`.

## TypeScript migration

`tsconfig.json` has `allowJs` on and `checkJs` off, so `.ts` and `.js` coexist.
The order that keeps the churn low:

1. `lib/` — pure, already unit-tested, and where the domain types belong.
2. `services/` — generate DB types with
   `supabase gen types typescript --linked > services/database.types.ts` so
   query results stop being `any`.
3. Screens, one feature at a time.

Turn on `checkJs` only when the JS left is small enough that its errors are
readable.

## Database changes

Migrations in `supabase/migrations/` are the source of truth, applied in
filename order. `supabase/schema.sql` is a reference dump — never applied.

```bash
supabase db push
```

### Migrations must replay from zero

Before pushing, run:

```bash
supabase db reset
```

That rebuilds the local database by replaying every migration in order, and is
the only thing that proves the chain still works. It is easy to break without
noticing, because `db push` only ever runs the migrations a given database has
not seen — so a file that has already been applied everywhere can be silently
unreplayable for months.

Two real examples:

- **Never "tidy up" a migration that has already run.** `20260724043406` was
  amended to move `location` into its natural position in the `profiles` view.
  Production had it last, because that is where
  `20260724050000_add_profile_location_column.sql` appended it. That one
  cosmetic edit broke `db reset` three separate ways — the follow-up migration,
  and later the pulled production snapshot, both tried to move the column back
  and hit `42P16: cannot change name of view column "location" to "pronouns"`
  (CREATE OR REPLACE VIEW may append trailing columns, never reorder or rename).
  Fixed by restoring the file to what actually ran. **An applied migration is a
  historical record, not source code** — to change the schema, add a new one.
- `20260725202735` revoked grants on `public.is_panel_admin()`, a function that
  exists only on the live database (it was created outside this repo), so a
  fresh replay died with `42883: function does not exist`. Fixed by guarding the
  statement in a `DO` block — the right tool when a migration must tolerate two
  legitimate starting states.

A freshly replayed database now produces the same `profiles` column order as
production. `20260727001000` still discovers the order from the catalog rather
than hardcoding it, which is what kept it working while the two disagreed.

### If `db push` says there is nothing to apply but the objects are missing

The remote history table can contain a version whose DDL never actually ran
(an interrupted push, or a `migration repair --status applied` that was too
optimistic). `db push` will then skip it forever. Confirm by querying for the
objects, then:

```bash
supabase migration repair --status reverted <version>
```

and push again. Write migrations idempotently (`CREATE OR REPLACE`,
`IF NOT EXISTS`, `DROP ... IF EXISTS`) so re-running one is always safe.

Two things to know before touching the schema:

- **`profiles` is a view** over `profile_core` / `profile_lifestyle` /
  `profile_preferences`, with `INSTEAD OF` triggers fanning writes back out.
- **`likes`, `matches` and `blocks` are views** over history-preserving `*_log`
  tables. Deletes soft-revoke. Realtime subscriptions must target the `*_log`
  table — logical replication never fires on a view.
